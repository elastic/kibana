/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { defaults } from 'lodash/fp';
import { PartialAlert } from '../../../../../alerts/server';
import { transformRuleToAlertAction } from '../../../../common/detection_engine/transform_actions';
import { PatchRulesOptions } from './types';
import { addTags } from './add_tags';
import { calculateVersion, calculateName, calculateInterval } from './utils';
import { ruleStatusSavedObjectsClientFactory } from '../signals/rule_status_saved_objects_client';

export const patchRules = async ({
  alertsClient,
  author,
  buildingBlockType,
  savedObjectsClient,
  description,
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
}: PatchRulesOptions): Promise<PartialAlert | null> => {
  if (rule == null) {
    return null;
  }

  const calculatedVersion = calculateVersion(rule.params.immutable, rule.params.version, {
    author,
    buildingBlockType,
    description,
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

  const update = await alertsClient.update({
    id: rule.id,
    data: {
      tags: addTags(tags ?? rule.tags, rule.params.ruleId, rule.params.immutable),
      throttle: null,
      name: calculateName({ updatedName: name, originalName: rule.name }),
      schedule: {
        interval: calculateInterval(interval, rule.schedule.interval),
      },
      actions: actions?.map(transformRuleToAlertAction) ?? rule.actions,
      params: nextParams,
    },
  });

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
