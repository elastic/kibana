/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validate } from '@kbn/securitysolution-io-ts-utils';
import { defaults } from 'lodash/fp';
import { PartialAlert } from '../../../../../alerting/server';
import { transformRuleToAlertAction } from '../../../../common/detection_engine/transform_actions';
import {
  normalizeMachineLearningJobIds,
  normalizeThresholdObject,
} from '../../../../common/detection_engine/utils';
// eslint-disable-next-line no-restricted-imports
import { legacyRuleActionsSavedObjectType } from '../rule_actions/legacy_saved_object_mappings';
import { internalRuleUpdate, RuleParams } from '../schemas/rule_schemas';
import { addTags } from './add_tags';
import { enableRule } from './enable_rule';
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

// eslint-disable-next-line complexity
export const patchRules = async ({
  rulesClient,
  savedObjectsClient,
  author,
  buildingBlockType,
  ruleStatusClient,
  spaceId,
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
}: PatchRulesOptions): Promise<PartialAlert<RuleParams> | null> => {
  if (rule == null) {
    return null;
  }

  /**
   * On update / patch I'm going to take the actions as they are, better off taking rules client.find (siem.notification) result
   * and putting that into the actions array of the rule, then set the rules onThrottle property, notifyWhen and throttle from null -> actualy value (1hr etc..)
   * Then use the rules client to delete the siem.notification
   * Then with the legacy Rule Actions saved object type, just delete it.
   */

  // find it using the references array, not params.ruleAlertId
  let migratedRule = false;
  const siemNotification = await rulesClient.find({
    options: {
      hasReference: {
        type: 'alert',
        id: rule.id,
      },
    },
  });

  const legacyRuleActionsSO = await savedObjectsClient.find({
    type: legacyRuleActionsSavedObjectType,
  });

  if (siemNotification != null && siemNotification.data.length > 0) {
    await rulesClient.delete({ id: siemNotification.data[0].id });
    if (legacyRuleActionsSO != null && legacyRuleActionsSO.saved_objects.length > 0) {
      await savedObjectsClient.delete(
        legacyRuleActionsSavedObjectType,
        legacyRuleActionsSO.saved_objects[0].id
      );
    }
    migratedRule = true;
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
    actions: migratedRule
      ? siemNotification.data[0].actions
      : actions?.map(transformRuleToAlertAction) ?? rule.actions,
    throttle: migratedRule
      ? siemNotification.data[0].schedule.interval
      : throttle !== undefined
      ? transformToAlertThrottle(throttle)
      : rule.throttle,
    notifyWhen: migratedRule
      ? transformToNotifyWhen(siemNotification.data[0].throttle)
      : throttle !== undefined
      ? transformToNotifyWhen(throttle)
      : rule.notifyWhen,
  };

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
    await enableRule({ rule, rulesClient, ruleStatusClient, spaceId });
  } else {
    // enabled is null or undefined and we do not touch the rule
  }

  if (enabled != null) {
    return { ...update, enabled };
  } else {
    return update;
  }
};
