/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defaults } from 'lodash/fp';
import { validate } from '../../../../common/validate';
import { PartialAlert } from '../../../../../alerting/server';
import { transformRuleToAlertAction } from '../../../../common/detection_engine/transform_actions';
import { PatchRulesOptions } from './types';
import { addTags } from './add_tags';
import { calculateVersion, calculateName, calculateInterval, removeUndefined } from './utils';
import { ruleStatusSavedObjectsClientFactory } from '../signals/rule_status_saved_objects_client';
import { internalRuleUpdate } from '../schemas/rule_schemas';
import { RuleTypeParams } from '../types';

class PatchError extends Error {
  public readonly statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const patchRules = async ({
  alertsClient,
  author,
  buildingBlockType,
  savedObjectsClient,
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
  threatQuery,
  threatMapping,
  threatLanguage,
  concurrentSearches,
  itemsPerSearch,
  timestampOverride,
  to,
  type,
  references,
  note,
  version,
  exceptionsList,
  anomalyThreshold,
  machineLearningJobId,
  actions,
}: PatchRulesOptions): Promise<PartialAlert<RuleTypeParams> | null> => {
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
      threshold,
      threatFilters,
      threatIndex,
      threatQuery,
      threatMapping,
      threatLanguage,
      concurrentSearches,
      itemsPerSearch,
      timestampOverride,
      to,
      type,
      references,
      note,
      version: calculatedVersion,
      exceptionsList,
      anomalyThreshold,
      machineLearningJobId,
    }
  );

  const newRule = {
    tags: addTags(tags ?? rule.tags, rule.params.ruleId, rule.params.immutable),
    throttle: null,
    notifyWhen: null,
    name: calculateName({ updatedName: name, originalName: rule.name }),
    schedule: {
      interval: calculateInterval(interval, rule.schedule.interval),
    },
    actions: actions?.map(transformRuleToAlertAction) ?? rule.actions,
    params: removeUndefined(nextParams),
  };
  const [validated, errors] = validate(newRule, internalRuleUpdate);
  if (errors != null || validated === null) {
    throw new PatchError(`Applying patch would create invalid rule: ${errors}`, 400);
  }

  /**
   * TODO: Remove this use of `as` by utilizing the proper type
   */
  const update = (await alertsClient.update({
    id: rule.id,
    data: validated,
  })) as PartialAlert<RuleTypeParams>;

  if (rule.enabled && enabled === false) {
    await alertsClient.disable({ id: rule.id });
  } else if (!rule.enabled && enabled === true) {
    await alertsClient.enable({ id: rule.id });

    const ruleStatusClient = ruleStatusSavedObjectsClientFactory(savedObjectsClient);
    const ruleCurrentStatus = await ruleStatusClient.find({
      perPage: 1,
      sortField: 'statusDate',
      sortOrder: 'desc',
      search: rule.id,
      searchFields: ['alertId'],
    });

    // set current status for this rule to be 'going to run'
    if (ruleCurrentStatus && ruleCurrentStatus.saved_objects.length > 0) {
      const currentStatusToDisable = ruleCurrentStatus.saved_objects[0];
      await ruleStatusClient.update(currentStatusToDisable.id, {
        ...currentStatusToDisable.attributes,
        status: 'going to run',
      });
    }
  } else {
    // enabled is null or undefined and we do not touch the rule
  }

  if (enabled != null) {
    return { ...update, enabled };
  } else {
    return update;
  }
};
