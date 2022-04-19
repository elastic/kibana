/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validate } from '@kbn/securitysolution-io-ts-utils';
import { defaults } from 'lodash/fp';
import { PartialRule } from '@kbn/alerting-plugin/server';
import { transformRuleToAlertAction } from '../../../../common/detection_engine/transform_actions';
import {
  normalizeMachineLearningJobIds,
  normalizeThresholdObject,
} from '../../../../common/detection_engine/utils';
import { internalRuleUpdate, RuleParams } from '../schemas/rule_schemas';
import { addTags } from './add_tags';
import { PatchRulesOptions } from './types';
import {
  calculateInterval,
  calculateName,
  calculateVersion,
  maybeMute,
  removeUndefined,
  transformToAlertThrottle,
  transformToNotifyWhen,
} from './utils';

class PatchError extends Error {
  public readonly statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const patchRules = async ({
  rulesClient,
  author,
  buildingBlockType,
  description,
  eventCategoryOverride,
  falsePositives,
  enabled,
  query,
  language,
  license,
  outputIndex,
  savedId,
  timelineId,
  timelineTitle,
  meta,
  filters,
  from,
  index,
  interval,
  maxSignals,
  riskScore,
  riskScoreMapping,
  ruleNameOverride,
  rule,
  name,
  severity,
  severityMapping,
  tags,
  threat,
  threshold,
  threatFilters,
  threatIndex,
  threatIndicatorPath,
  threatQuery,
  threatMapping,
  threatLanguage,
  concurrentSearches,
  itemsPerSearch,
  timestampOverride,
  throttle,
  to,
  type,
  references,
  namespace,
  note,
  version,
  exceptionsList,
  anomalyThreshold,
  machineLearningJobId,
  actions,
}: PatchRulesOptions): Promise<PartialRule<RuleParams> | null> => {
  if (rule == null) {
    return null;
  }

  const calculatedVersion = calculateVersion(rule.params.immutable, rule.params.version, {
    author,
    buildingBlockType,
    description,
    eventCategoryOverride,
    falsePositives,
    query,
    language,
    license,
    outputIndex,
    savedId,
    timelineId,
    timelineTitle,
    meta,
    filters,
    from,
    index,
    interval,
    maxSignals,
    riskScore,
    riskScoreMapping,
    ruleNameOverride,
    name,
    severity,
    severityMapping,
    tags,
    threat,
    threshold,
    threatFilters,
    threatIndex,
    threatIndicatorPath,
    threatQuery,
    threatMapping,
    threatLanguage,
    concurrentSearches,
    itemsPerSearch,
    timestampOverride,
    to,
    type,
    references,
    version,
    namespace,
    note,
    exceptionsList,
    anomalyThreshold,
    machineLearningJobId,
  });

  const nextParams = defaults(
    {
      ...rule.params,
    },
    {
      author,
      buildingBlockType,
      description,
      falsePositives,
      from,
      query,
      language,
      license,
      outputIndex,
      savedId,
      timelineId,
      timelineTitle,
      meta,
      filters,
      index,
      maxSignals,
      riskScore,
      riskScoreMapping,
      ruleNameOverride,
      severity,
      severityMapping,
      threat,
      threshold: threshold ? normalizeThresholdObject(threshold) : undefined,
      threatFilters,
      threatIndex,
      threatIndicatorPath,
      threatQuery,
      threatMapping,
      threatLanguage,
      concurrentSearches,
      itemsPerSearch,
      timestampOverride,
      to,
      type,
      references,
      namespace,
      note,
      version: calculatedVersion,
      exceptionsList,
      anomalyThreshold,
      machineLearningJobId: machineLearningJobId
        ? normalizeMachineLearningJobIds(machineLearningJobId)
        : undefined,
    }
  );

  const newRule = {
    tags: addTags(tags ?? rule.tags, rule.params.ruleId, rule.params.immutable),
    name: calculateName({ updatedName: name, originalName: rule.name }),
    schedule: {
      interval: calculateInterval(interval, rule.schedule.interval),
    },
    params: removeUndefined(nextParams),
    actions: actions?.map(transformRuleToAlertAction) ?? rule.actions,
    throttle: throttle !== undefined ? transformToAlertThrottle(throttle) : rule.throttle,
    notifyWhen: throttle !== undefined ? transformToNotifyWhen(throttle) : rule.notifyWhen,
  };
  console.log({ newRule });
  const [validated, errors] = validate(newRule, internalRuleUpdate);
  if (errors != null || validated === null) {
    throw new PatchError(`Applying patch would create invalid rule: ${errors}`, 400);
  }

  const update = await rulesClient.update({
    id: rule.id,
    data: validated,
  });

  if (throttle !== undefined) {
    await maybeMute({ rulesClient, muteAll: rule.muteAll, throttle, id: update.id });
  }

  if (rule.enabled && enabled === false) {
    await rulesClient.disable({ id: rule.id });
  } else if (!rule.enabled && enabled === true) {
    await rulesClient.enable({ id: rule.id });
  } else {
    // enabled is null or undefined and we do not touch the rule
  }

  if (enabled != null) {
    return { ...update, enabled };
  } else {
    return update;
  }
};
