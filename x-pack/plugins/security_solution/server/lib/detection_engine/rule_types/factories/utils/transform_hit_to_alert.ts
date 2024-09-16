/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'lodash';
import type * as estypes from '@elastic/elasticsearch/lib/api/types';
import { requiredOptional } from '@kbn/zod-helpers';
import { EVENT_KIND } from '@kbn/rule-data-utils';

import type { BaseHit } from '../../../../../../common/detection_engine/types';
import type { ConfigType } from '../../../../../config';
import type { BuildReasonMessage } from '../../utils/reason_formatters';
import { getMergeStrategy } from '../../utils/source_fields_merging/strategies';
import type { SignalSource, SignalSourceHit } from '../../types';
import { buildAlertFields, isThresholdResult } from './build_alert';
import type { CompleteRule, RuleParams } from '../../../rule_schema';
import type { IRuleExecutionLogForExecutors } from '../../../rule_monitoring';
import { buildRuleNameFromMapping } from '../../utils/mappings/build_rule_name_from_mapping';
import { buildSeverityFromMapping } from '../../utils/mappings/build_severity_from_mapping';
import { buildRiskScoreFromMapping } from '../../utils/mappings/build_risk_score_from_mapping';
import type { BaseFieldsLatest } from '../../../../../../common/api/detection_engine/model/alerts';
import { traverseAndMutateDoc } from './strip_non_ecs_fields';
import { ALERT_THRESHOLD_RESULT } from '../../../../../../common/field_maps/field_names';
import { robustGet, robustSet } from '../../utils/source_fields_merging/utils/robust_field_access';

const isSourceDoc = (hit: SignalSourceHit): hit is BaseHit<SignalSource> => {
  return hit._source != null && hit._id != null;
};

export interface TransformHitToAlertProps {
  spaceId: string | null | undefined;
  completeRule: CompleteRule<RuleParams>;
  doc: estypes.SearchHit<SignalSource>;
  mergeStrategy: ConfigType['alertMergeStrategy'];
  ignoreFields: Record<string, boolean>;
  ignoreFieldsRegexes: string[];
  applyOverrides: boolean;
  buildReasonMessage: BuildReasonMessage;
  indicesToQuery: string[];
  alertTimestampOverride: Date | undefined;
  ruleExecutionLogger: IRuleExecutionLogForExecutors;
  alertUuid: string;
  publicBaseUrl?: string;
}

/**
 * Formats the search_after result for insertion into the signals index. We first create a
 * "best effort" merged "fields" with the "_source" object, then build the signal object,
 * then the event object, and finally we strip away any additional temporary data that was added
 * such as the "threshold_result".
 * @param completeRule The rule saved object to build overrides
 * @param doc The SignalSourceHit with "_source", "fields", and additional data such as "threshold_result"
 * @returns The body that can be added to a bulk call for inserting the signal.
 */
export const transformHitToAlert = ({
  spaceId,
  completeRule,
  doc,
  mergeStrategy,
  ignoreFields,
  ignoreFieldsRegexes,
  applyOverrides,
  buildReasonMessage,
  indicesToQuery,
  alertTimestampOverride,
  ruleExecutionLogger,
  alertUuid,
  publicBaseUrl,
}: TransformHitToAlertProps): BaseFieldsLatest => {
  const mergedDoc = getMergeStrategy(mergeStrategy)({ doc, ignoreFields, ignoreFieldsRegexes });
  const thresholdResult = mergedDoc._source?.threshold_result;

  if (isSourceDoc(mergedDoc)) {
    const overrides = applyOverrides
      ? {
          nameOverride: buildRuleNameFromMapping({
            eventSource: mergedDoc._source ?? {},
            ruleName: completeRule.ruleConfig.name,
            ruleNameMapping: completeRule.ruleParams.ruleNameOverride,
          }).ruleName,
          severityOverride: buildSeverityFromMapping({
            eventSource: mergedDoc._source ?? {},
            severity: completeRule.ruleParams.severity,
            severityMapping: completeRule.ruleParams.severityMapping,
          }).severity,
          riskScoreOverride: buildRiskScoreFromMapping({
            eventSource: mergedDoc._source ?? {},
            riskScore: completeRule.ruleParams.riskScore,
            riskScoreMapping: requiredOptional(completeRule.ruleParams.riskScoreMapping),
          }).riskScore,
        }
      : undefined;

    const reason = buildReasonMessage({
      name: overrides?.nameOverride ?? completeRule.ruleConfig.name,
      severity: overrides?.severityOverride ?? completeRule.ruleParams.severity,
      mergedDoc,
    });

    const alertFields = buildAlertFields({
      docs: [mergedDoc],
      completeRule,
      spaceId,
      reason,
      indicesToQuery,
      alertUuid,
      publicBaseUrl,
      alertTimestampOverride,
      overrides,
    });

    const {
      result: validatedSource,
      removed: removedSourceFields,
      fieldsToAdd,
    } = traverseAndMutateDoc(mergedDoc._source);

    // The `alertFields` we add to alerts contain `event.kind: 'signal'` in dot notation. To avoid duplicating `event.kind`,
    // we remove any existing `event.kind` field here before we merge `alertFields` into `validatedSource` later on
    if (robustGet({ key: EVENT_KIND, document: validatedSource }) != null) {
      robustSet({ key: EVENT_KIND, document: validatedSource, valueToSet: undefined });
    }

    if (removedSourceFields.length) {
      ruleExecutionLogger?.debug(
        'Following fields were removed from alert source as ECS non-compliant:',
        JSON.stringify(removedSourceFields)
      );
    }

    merge(validatedSource, alertFields);
    if (thresholdResult != null && isThresholdResult(thresholdResult)) {
      validatedSource[ALERT_THRESHOLD_RESULT] = thresholdResult;
    }
    fieldsToAdd.forEach(({ key, value }) => {
      validatedSource[key] = value;
    });
    return validatedSource as BaseFieldsLatest;
  }

  throw Error('Error building alert from source document.');
};
