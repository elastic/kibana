/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { defaults } from 'lodash/fp';
import { PartialAlert } from '../../../../../alerts/server';
import { transformRuleToAlertAction } from '../../../../common/detection_engine/transform_actions';
import { PatchRuleParams } from './types';
import { addTags } from './add_tags';
import { calculateVersion, calculateName, calculateInterval } from './utils';
import { ruleStatusSavedObjectsClientFactory } from '../signals/rule_status_saved_objects_client';

export const patchRules = async ({
  alertsClient,
  savedObjectsClient,
  description,
  falsePositives,
  enabled,
  query,
  language,
  outputIndex,
  savedId,
  timelineId,
  timelineTitle,
  meta,
  filters,
  from,
  immutable,
  index,
  interval,
  maxSignals,
  riskScore,
  rule,
  name,
  severity,
  tags,
  threat,
  to,
  type,
  references,
  note,
  version,
  exceptions_list,
  anomalyThreshold,
  machineLearningJobId,
  actions,
}: PatchRuleParams): Promise<PartialAlert | null> => {
  if (rule == null) {
    return null;
  }

  const calculatedVersion = calculateVersion(rule.params.immutable, rule.params.version, {
    description,
    falsePositives,
    query,
    language,
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
    name,
    severity,
    tags,
    threat,
    to,
    type,
    references,
    version,
    note,
    exceptions_list,
    anomalyThreshold,
    machineLearningJobId,
  });

  const nextParams = defaults(
    {
      ...rule.params,
    },
    {
      description,
      falsePositives,
      from,
      immutable,
      query,
      language,
      outputIndex,
      savedId,
      timelineId,
      timelineTitle,
      meta,
      filters,
      index,
      maxSignals,
      riskScore,
      severity,
      threat,
      to,
      type,
      references,
      note,
      version: calculatedVersion,
      exceptions_list,
      anomalyThreshold,
      machineLearningJobId,
    }
  );

  const update = await alertsClient.update({
    id: rule.id,
    data: {
      tags: addTags(tags ?? rule.tags, rule.params.ruleId, immutable ?? rule.params.immutable),
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
