/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { transformRuleToAlertAction } from '../../../../common/detection_engine/transform_actions';
import { PartialAlert } from '../../../../../alerts/server';
import { readRules } from './read_rules';
import { UpdateRuleParams } from './types';
import { addTags } from './add_tags';
import { calculateVersion } from './utils';
import { hasListsFeature } from '../feature_flags';
import { ruleStatusSavedObjectsClientFactory } from '../signals/rule_status_saved_objects_client';

export const updateRules = async ({
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
  id,
  ruleId,
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
  actions,
}: UpdateRuleParams): Promise<PartialAlert | null> => {
  const rule = await readRules({ alertsClient, ruleId, id });
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
    anomalyThreshold,
    machineLearningJobId,
  });

  // TODO: Remove this and use regular exceptions_list once the feature is stable for a release
  const exceptionsListParam = hasListsFeature() ? { exceptions_list } : {};

  const update = await alertsClient.update({
    id: rule.id,
    data: {
      tags: addTags(tags, rule.params.ruleId, rule.params.immutable),
      name,
      schedule: { interval },
      actions: actions.map(transformRuleToAlertAction),
      throttle: null,
      params: {
        description,
        ruleId: rule.params.ruleId,
        falsePositives,
        from,
        immutable: rule.params.immutable,
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
        anomalyThreshold,
        machineLearningJobId,
        ...exceptionsListParam,
      },
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
  }

  return { ...update, enabled };
};
