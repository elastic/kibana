/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { transformRuleToAlertAction } from '../../../../common/detection_engine/transform_actions';
import { PartialAlert } from '../../../../../alerts/server';
import { readRules } from './read_rules';
import { UpdateRulesOptions } from './types';
import { addTags } from './add_tags';
import { calculateVersion } from './utils';
import { ruleStatusSavedObjectsClientFactory } from '../signals/rule_status_saved_objects_client';

export const updateRules = async ({
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
  id,
  ruleId,
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
  actions,
}: UpdateRulesOptions): Promise<PartialAlert | null> => {
  const rules = await readRules({ alertsClient, ruleIds: ruleId ? [ruleId] : undefined, id });
  if (rules == null) {
    return null;
  }

  const calculatedVersion = calculateVersion(rules[0].params.immutable, rules[0].params.version, {
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
    anomalyThreshold,
    machineLearningJobId,
    exceptionsList,
  });

  const update = await alertsClient.update({
    id: rules[0].id,
    data: {
      tags: addTags(tags, rules[0].params.ruleId, rules[0].params.immutable),
      name,
      schedule: { interval },
      actions: actions.map(transformRuleToAlertAction),
      throttle: null,
      params: {
        author,
        buildingBlockType,
        description,
        ruleId: rules[0].params.ruleId,
        falsePositives,
        from,
        immutable: rules[0].params.immutable,
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
        anomalyThreshold,
        machineLearningJobId,
        exceptionsList,
      },
    },
  });

  if (rules[0].enabled && enabled === false) {
    await alertsClient.disable({ id: rules[0].id });
  } else if (!rules[0].enabled && enabled === true) {
    await alertsClient.enable({ id: rules[0].id });

    const ruleStatusClient = ruleStatusSavedObjectsClientFactory(savedObjectsClient);
    const ruleCurrentStatus = await ruleStatusClient.find({
      perPage: 1,
      sortField: 'statusDate',
      sortOrder: 'desc',
      search: rules[0].id,
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
