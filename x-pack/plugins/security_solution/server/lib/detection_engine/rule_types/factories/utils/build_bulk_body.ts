/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EVENT_KIND, TIMESTAMP } from '@kbn/rule-data-utils';
import { flattenWithPrefix } from '@kbn/securitysolution-rules';

import { BaseHit } from '../../../../../../common/detection_engine/types';
import type { ConfigType } from '../../../../../config';
import { BuildReasonMessage } from '../../../signals/reason_formatters';
import { getMergeStrategy } from '../../../signals/source_fields_merging/strategies';
import { BaseSignalHit, SignalSource, SignalSourceHit, SimpleHit } from '../../../signals/types';
import { RACAlert } from '../../types';
import { additionalAlertFields, buildAlert } from './build_alert';
import { filterSource } from './filter_source';
import { CompleteRule, RuleParams } from '../../../schemas/rule_schemas';
import { buildRuleNameFromMapping } from '../../../signals/mappings/build_rule_name_from_mapping';
import { buildSeverityFromMapping } from '../../../signals/mappings/build_severity_from_mapping';
import { buildRiskScoreFromMapping } from '../../../signals/mappings/build_risk_score_from_mapping';

const isSourceDoc = (
  hit: SignalSourceHit
): hit is BaseHit<{ '@timestamp': string; _source: SignalSource }> => {
  return hit._source != null;
};

const buildEventTypeAlert = (doc: BaseSignalHit): object => {
  if (doc._source?.event != null && doc._source?.event instanceof Object) {
    return flattenWithPrefix('event', doc._source?.event ?? {});
  }
  return {};
};

/**
 * Formats the search_after result for insertion into the signals index. We first create a
 * "best effort" merged "fields" with the "_source" object, then build the signal object,
 * then the event object, and finally we strip away any additional temporary data that was added
 * such as the "threshold_result".
 * @param completeRule The rule saved object to build overrides
 * @param doc The SignalSourceHit with "_source", "fields", and additional data such as "threshold_result"
 * @returns The body that can be added to a bulk call for inserting the signal.
 */
export const buildBulkBody = (
  spaceId: string | null | undefined,
  completeRule: CompleteRule<RuleParams>,
  doc: SimpleHit,
  mergeStrategy: ConfigType['alertMergeStrategy'],
  ignoreFields: ConfigType['alertIgnoreFields'],
  applyOverrides: boolean,
  buildReasonMessage: BuildReasonMessage
): RACAlert => {
  const mergedDoc = getMergeStrategy(mergeStrategy)({ doc, ignoreFields });
  const eventFields = buildEventTypeAlert(mergedDoc);
  const filteredSource = filterSource(mergedDoc);

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
          riskScoreMapping: completeRule.ruleParams.riskScoreMapping,
        }).riskScore,
      }
    : undefined;

  const reason = buildReasonMessage({
    name: overrides?.nameOverride ?? completeRule.ruleConfig.name,
    severity: overrides?.severityOverride ?? completeRule.ruleParams.severity,
    mergedDoc,
  });

  if (isSourceDoc(mergedDoc)) {
    return {
      ...filteredSource,
      ...eventFields,
      ...buildAlert([mergedDoc], completeRule, spaceId, reason, overrides),
      ...additionalAlertFields({ ...mergedDoc, _source: { ...mergedDoc._source, ...eventFields } }),
      [EVENT_KIND]: 'signal',
      [TIMESTAMP]: new Date().toISOString(),
    };
  }

  throw Error('Error building alert from source document.');
};
