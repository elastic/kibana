/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SIGNALS_ID, ruleTypeMappings } from '@kbn/securitysolution-rules';

import {
  normalizeMachineLearningJobIds,
  normalizeThresholdObject,
} from '../../../../common/detection_engine/utils';
import { transformRuleToAlertAction } from '../../../../common/detection_engine/transform_actions';
import { SanitizedAlert } from '../../../../../alerting/common';
import {
  DEFAULT_INDICATOR_SOURCE_PATH,
  NOTIFICATION_THROTTLE_NO_ACTIONS,
  SERVER_APP_ID,
} from '../../../../common/constants';
import { CreateRulesOptions } from './types';
import { addTags } from './add_tags';
import { PartialFilter, RuleTypeParams } from '../types';
import { transformToAlertThrottle, transformToNotifyWhen } from './utils';

export const createRules = async ({
  rulesClient,
  anomalyThreshold,
  author,
  buildingBlockType,
  description,
  enabled,
  eventCategoryOverride,
  falsePositives,
  from,
  query,
  language,
  license,
  savedId,
  timelineId,
  timelineTitle,
  meta,
  machineLearningJobId,
  filters,
  ruleId,
  immutable,
  index,
  interval,
  maxSignals,
  riskScore,
  riskScoreMapping,
  ruleNameOverride,
  outputIndex,
  name,
  severity,
  severityMapping,
  tags,
  threat,
  threatFilters,
  threatIndex,
  threatIndicatorPath,
  threatLanguage,
  concurrentSearches,
  itemsPerSearch,
  threatQuery,
  threatMapping,
  threshold,
  timestampOverride,
  throttle,
  to,
  type,
  references,
  namespace,
  note,
  version,
  exceptionsList,
  actions,
  isRuleRegistryEnabled,
}: CreateRulesOptions): Promise<SanitizedAlert<RuleTypeParams>> => {
  const rule = await rulesClient.create<RuleTypeParams>({
    data: {
      name,
      tags: addTags(tags, ruleId, immutable),
      alertTypeId: isRuleRegistryEnabled ? ruleTypeMappings[type] : SIGNALS_ID,
      consumer: SERVER_APP_ID,
      params: {
        anomalyThreshold,
        author,
        buildingBlockType,
        description,
        ruleId,
        index,
        eventCategoryOverride,
        falsePositives,
        from,
        immutable,
        query,
        language,
        license,
        outputIndex,
        savedId,
        timelineId,
        timelineTitle,
        meta,
        machineLearningJobId: machineLearningJobId
          ? normalizeMachineLearningJobIds(machineLearningJobId)
          : undefined,
        filters,
        maxSignals,
        riskScore,
        riskScoreMapping,
        ruleNameOverride,
        severity,
        severityMapping,
        threat,
        threshold: threshold ? normalizeThresholdObject(threshold) : undefined,
        /**
         * TODO: Fix typing inconsistancy between `RuleTypeParams` and `CreateRulesOptions`
         */
        threatFilters: threatFilters as PartialFilter[] | undefined,
        threatIndex,
        threatIndicatorPath:
          threatIndicatorPath ??
          (type === 'threat_match' ? DEFAULT_INDICATOR_SOURCE_PATH : undefined),
        threatQuery,
        concurrentSearches,
        itemsPerSearch,
        threatMapping,
        threatLanguage,
        timestampOverride,
        to,
        type,
        references,
        namespace,
        note,
        version,
        exceptionsList,
      },
      schedule: { interval },
      enabled,
      actions: actions.map(transformRuleToAlertAction),
      throttle: transformToAlertThrottle(throttle),
      notifyWhen: transformToNotifyWhen(throttle),
    },
  });

  // Mute the rule if it is first created with the explicit no actions
  if (throttle === NOTIFICATION_THROTTLE_NO_ACTIONS) {
    await rulesClient.muteAll({ id: rule.id });
  }

  return rule;
};
