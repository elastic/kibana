/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_REASON,
  ALERT_RISK_SCORE,
  ALERT_RULE_AUTHOR,
  ALERT_RULE_CONSUMER,
  ALERT_RULE_CREATED_AT,
  ALERT_RULE_CREATED_BY,
  ALERT_RULE_DESCRIPTION,
  ALERT_RULE_ENABLED,
  ALERT_RULE_FROM,
  ALERT_RULE_INTERVAL,
  ALERT_RULE_LICENSE,
  ALERT_RULE_NAME,
  ALERT_RULE_NAMESPACE_FIELD,
  ALERT_RULE_NOTE,
  ALERT_RULE_PARAMETERS,
  ALERT_RULE_REFERENCES,
  ALERT_RULE_RULE_ID,
  ALERT_RULE_RULE_NAME_OVERRIDE,
  ALERT_RULE_TAGS,
  ALERT_RULE_TO,
  ALERT_RULE_TYPE,
  ALERT_RULE_UPDATED_AT,
  ALERT_RULE_UPDATED_BY,
  ALERT_RULE_UUID,
  ALERT_RULE_VERSION,
  ALERT_SEVERITY,
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_WORKFLOW_STATUS,
  EVENT_KIND,
  SPACE_IDS,
  TIMESTAMP,
} from '@kbn/rule-data-utils';
import { flattenWithPrefix } from '@kbn/securitysolution-rules';

import { createHash } from 'crypto';

import type { BaseSignalHit, SimpleHit, ThresholdResult } from '../../../signals/types';
import {
  getField,
  getValidDateFromDoc,
  isWrappedDetectionAlert,
  isWrappedSignalHit,
} from '../../../signals/utils';
import { SERVER_APP_ID } from '../../../../../../common/constants';
import type { SearchTypes } from '../../../../telemetry/types';
import {
  ALERT_ANCESTORS,
  ALERT_DEPTH,
  ALERT_ORIGINAL_TIME,
  ALERT_THRESHOLD_RESULT,
  ALERT_ORIGINAL_EVENT,
  ALERT_BUILDING_BLOCK_TYPE,
  ALERT_RULE_ACTIONS,
  ALERT_RULE_INDICES,
  ALERT_RULE_THROTTLE,
  ALERT_RULE_TIMELINE_ID,
  ALERT_RULE_TIMELINE_TITLE,
  ALERT_RULE_META,
  ALERT_RULE_TIMESTAMP_OVERRIDE,
  ALERT_RULE_FALSE_POSITIVES,
  ALERT_RULE_MAX_SIGNALS,
  ALERT_RULE_RISK_SCORE_MAPPING,
  ALERT_RULE_SEVERITY_MAPPING,
  ALERT_RULE_THREAT,
  ALERT_RULE_EXCEPTIONS_LIST,
  ALERT_RULE_IMMUTABLE,
} from '../../../../../../common/field_maps/field_names';
import type { CompleteRule, RuleParams } from '../../../rule_schema';
import { commonParamsCamelToSnake, typeSpecificCamelToSnake } from '../../../rule_management';
import { transformAlertToRuleAction } from '../../../../../../common/detection_engine/transform_actions';
import type {
  AncestorLatest,
  BaseFieldsLatest,
} from '../../../../../../common/detection_engine/schemas/alerts';

export const generateAlertId = (alert: BaseFieldsLatest) => {
  return createHash('sha256')
    .update(
      alert[ALERT_ANCESTORS].reduce(
        (acc, ancestor) => acc.concat(ancestor.id, ancestor.index),
        ''
      ).concat(alert[ALERT_RULE_UUID])
    )
    .digest('hex');
};

/**
 * Takes an event document and extracts the information needed for the corresponding entry in the child
 * alert's ancestors array.
 * @param doc The parent event
 */
export const buildParent = (doc: SimpleHit): AncestorLatest => {
  const isSignal: boolean = isWrappedSignalHit(doc) || isWrappedDetectionAlert(doc);
  const parent: AncestorLatest = {
    id: doc._id,
    type: isSignal ? 'signal' : 'event',
    index: doc._index,
    depth: isSignal ? (getField(doc, ALERT_DEPTH) as number | undefined) ?? 1 : 0,
    rule: isSignal ? (getField(doc, ALERT_RULE_UUID) as string) : undefined,
  };
  return parent;
};

/**
 * Takes a parent event document with N ancestors and adds the parent document to the ancestry array,
 * creating an array of N+1 ancestors.
 * @param doc The parent event for which to extend the ancestry.
 */
export const buildAncestors = (doc: SimpleHit): AncestorLatest[] => {
  const newAncestor = buildParent(doc);
  const existingAncestors: AncestorLatest[] =
    (getField(doc, ALERT_ANCESTORS) as AncestorLatest[] | undefined) ?? [];
  return [...existingAncestors, newAncestor];
};

/**
 * Builds the `kibana.alert.*` fields that are common across all alerts.
 * @param docs The parent alerts/events of the new alert to be built.
 * @param rule The rule that is generating the new alert.
 * @param spaceId The space ID in which the rule was executed.
 * @param reason Human readable string summarizing alert.
 * @param indicesToQuery Array of index patterns searched by the rule.
 */
export const buildAlert = (
  docs: SimpleHit[],
  completeRule: CompleteRule<RuleParams>,
  spaceId: string | null | undefined,
  reason: string,
  indicesToQuery: string[],
  overrides?: {
    nameOverride: string;
    severityOverride: string;
    riskScoreOverride: number;
  }
): BaseFieldsLatest => {
  const parents = docs.map(buildParent);
  const depth = parents.reduce((acc, parent) => Math.max(parent.depth, acc), 0) + 1;
  const ancestors = docs.reduce(
    (acc: AncestorLatest[], doc) => acc.concat(buildAncestors(doc)),
    []
  );

  const { output_index: outputIndex, ...commonRuleParams } = commonParamsCamelToSnake(
    completeRule.ruleParams
  );

  const ruleParamsSnakeCase = {
    ...commonRuleParams,
    ...typeSpecificCamelToSnake(completeRule.ruleParams),
  };

  const {
    actions,
    schedule,
    name,
    tags,
    enabled,
    createdBy,
    updatedBy,
    throttle,
    createdAt,
    updatedAt,
  } = completeRule.ruleConfig;

  const params = completeRule.ruleParams;

  const originalTime = getValidDateFromDoc({
    doc: docs[0],
    primaryTimestamp: TIMESTAMP,
  });

  return {
    [TIMESTAMP]: new Date().toISOString(),
    [SPACE_IDS]: spaceId != null ? [spaceId] : [],
    [EVENT_KIND]: 'signal',
    [ALERT_ORIGINAL_TIME]: originalTime?.toISOString(),
    [ALERT_RULE_CONSUMER]: SERVER_APP_ID,
    [ALERT_ANCESTORS]: ancestors,
    [ALERT_STATUS]: ALERT_STATUS_ACTIVE,
    [ALERT_WORKFLOW_STATUS]: 'open',
    [ALERT_DEPTH]: depth,
    [ALERT_REASON]: reason,
    [ALERT_BUILDING_BLOCK_TYPE]: params.buildingBlockType,
    [ALERT_SEVERITY]: overrides?.severityOverride ?? params.severity,
    [ALERT_RISK_SCORE]: overrides?.riskScoreOverride ?? params.riskScore,
    [ALERT_RULE_PARAMETERS]: ruleParamsSnakeCase,
    [ALERT_RULE_ACTIONS]: actions.map(transformAlertToRuleAction),
    [ALERT_RULE_AUTHOR]: params.author,
    [ALERT_RULE_CREATED_AT]: createdAt.toISOString(),
    [ALERT_RULE_CREATED_BY]: createdBy ?? '',
    [ALERT_RULE_DESCRIPTION]: params.description,
    [ALERT_RULE_ENABLED]: enabled,
    [ALERT_RULE_EXCEPTIONS_LIST]: params.exceptionsList,
    [ALERT_RULE_FALSE_POSITIVES]: params.falsePositives,
    [ALERT_RULE_FROM]: params.from,
    [ALERT_RULE_IMMUTABLE]: params.immutable,
    [ALERT_RULE_INTERVAL]: schedule.interval,
    [ALERT_RULE_INDICES]: indicesToQuery,
    [ALERT_RULE_LICENSE]: params.license,
    [ALERT_RULE_MAX_SIGNALS]: params.maxSignals,
    [ALERT_RULE_NAME]: overrides?.nameOverride ?? name,
    [ALERT_RULE_NAMESPACE_FIELD]: params.namespace,
    [ALERT_RULE_NOTE]: params.note,
    [ALERT_RULE_REFERENCES]: params.references,
    [ALERT_RULE_RISK_SCORE_MAPPING]: params.riskScoreMapping,
    [ALERT_RULE_RULE_ID]: params.ruleId,
    [ALERT_RULE_RULE_NAME_OVERRIDE]: params.ruleNameOverride,
    [ALERT_RULE_SEVERITY_MAPPING]: params.severityMapping,
    [ALERT_RULE_TAGS]: tags,
    [ALERT_RULE_THREAT]: params.threat,
    [ALERT_RULE_THROTTLE]: throttle ?? undefined,
    [ALERT_RULE_TIMELINE_ID]: params.timelineId,
    [ALERT_RULE_TIMELINE_TITLE]: params.timelineTitle,
    [ALERT_RULE_TIMESTAMP_OVERRIDE]: params.timestampOverride,
    [ALERT_RULE_TO]: params.to,
    [ALERT_RULE_TYPE]: params.type,
    [ALERT_RULE_UPDATED_AT]: updatedAt.toISOString(),
    [ALERT_RULE_UPDATED_BY]: updatedBy ?? '',
    [ALERT_RULE_UUID]: completeRule.alertId,
    [ALERT_RULE_VERSION]: params.version,
    ...flattenWithPrefix(ALERT_RULE_META, params.meta),
    // These fields don't exist in the mappings, but leaving here for now to limit changes to the alert building logic
    'kibana.alert.rule.risk_score': params.riskScore,
    'kibana.alert.rule.severity': params.severity,
    'kibana.alert.rule.building_block_type': params.buildingBlockType,
  };
};

const isThresholdResult = (thresholdResult: SearchTypes): thresholdResult is ThresholdResult => {
  return typeof thresholdResult === 'object';
};

/**
 * Creates signal fields that are only available in the special case where a signal has only 1 parent signal/event.
 * We copy the original time from the document as "original_time" since we override the timestamp with the current date time.
 * @param doc The parent signal/event of the new signal to be built.
 */
export const additionalAlertFields = (doc: BaseSignalHit) => {
  const thresholdResult = doc._source?.threshold_result;
  if (thresholdResult != null && !isThresholdResult(thresholdResult)) {
    throw new Error(`threshold_result failed to validate: ${thresholdResult}`);
  }
  const additionalFields: Record<string, SearchTypes> = {
    ...(thresholdResult != null ? { [ALERT_THRESHOLD_RESULT]: thresholdResult } : {}),
  };

  for (const [key, val] of Object.entries(doc._source ?? {})) {
    if (key.startsWith('event.')) {
      additionalFields[`${ALERT_ORIGINAL_EVENT}.${key.replace('event.', '')}`] = val;
    }
  }
  return additionalFields;
};
