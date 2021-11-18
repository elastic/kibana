/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_REASON,
  ALERT_RULE_CONSUMER,
  ALERT_RULE_NAMESPACE,
  ALERT_RULE_UUID,
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_WORKFLOW_STATUS,
  SPACE_IDS,
  TIMESTAMP,
} from '@kbn/rule-data-utils';
import { flattenWithPrefix } from '@kbn/securitysolution-rules';

import { createHash } from 'crypto';

import { RulesSchema } from '../../../../../../common/detection_engine/schemas/response/rules_schema';
import { Ancestor, BaseSignalHit, SimpleHit, ThresholdResult } from '../../../signals/types';
import {
  getField,
  getValidDateFromDoc,
  isWrappedRACAlert,
  isWrappedSignalHit,
} from '../../../signals/utils';
import { RACAlert } from '../../types';
import { SERVER_APP_ID } from '../../../../../../common/constants';
import { SearchTypes } from '../../../../telemetry/types';
import {
  ALERT_ANCESTORS,
  ALERT_DEPTH,
  ALERT_ORIGINAL_TIME,
  ALERT_THRESHOLD_RESULT,
  ALERT_ORIGINAL_EVENT,
} from '../../../../../../common/field_maps/field_names';

export const generateAlertId = (alert: RACAlert) => {
  return createHash('sha256')
    .update(
      (alert[ALERT_ANCESTORS] as Ancestor[])
        .reduce((acc, ancestor) => acc.concat(ancestor.id, ancestor.index), '')
        .concat(alert[ALERT_RULE_UUID] as string)
    )
    .digest('hex');
};

/**
 * Takes an event document and extracts the information needed for the corresponding entry in the child
 * alert's ancestors array.
 * @param doc The parent event
 */
export const buildParent = (doc: SimpleHit): Ancestor => {
  const isSignal: boolean = isWrappedSignalHit(doc) || isWrappedRACAlert(doc);
  const parent: Ancestor = {
    id: doc._id,
    type: isSignal ? 'signal' : 'event',
    index: doc._index,
    depth: isSignal ? getField(doc, ALERT_DEPTH) ?? 1 : 0,
  };
  if (isSignal) {
    parent.rule = getField(doc, ALERT_RULE_UUID);
  }
  return parent;
};

/**
 * Takes a parent event document with N ancestors and adds the parent document to the ancestry array,
 * creating an array of N+1 ancestors.
 * @param doc The parent event for which to extend the ancestry.
 */
export const buildAncestors = (doc: SimpleHit): Ancestor[] => {
  const newAncestor = buildParent(doc);
  const existingAncestors: Ancestor[] = getField(doc, ALERT_ANCESTORS) ?? [];
  return [...existingAncestors, newAncestor];
};

/**
 * Builds the `kibana.alert.*` fields that are common across all alerts.
 * @param docs The parent alerts/events of the new alert to be built.
 * @param rule The rule that is generating the new alert.
 * @param spaceId The space ID in which the rule was executed.
 * @param reason Human readable string summarizing alert.
 */
export const buildAlert = (
  docs: SimpleHit[],
  rule: RulesSchema,
  spaceId: string | null | undefined,
  reason: string
): RACAlert => {
  const parents = docs.map(buildParent);
  const depth = parents.reduce((acc, parent) => Math.max(parent.depth, acc), 0) + 1;
  const ancestors = docs.reduce((acc: Ancestor[], doc) => acc.concat(buildAncestors(doc)), []);

  const { id, output_index: outputIndex, ...mappedRule } = rule;
  mappedRule.uuid = id;

  return {
    [TIMESTAMP]: new Date().toISOString(),
    [ALERT_RULE_CONSUMER]: SERVER_APP_ID,
    [SPACE_IDS]: spaceId != null ? [spaceId] : [],
    [ALERT_ANCESTORS]: ancestors,
    [ALERT_STATUS]: ALERT_STATUS_ACTIVE,
    [ALERT_WORKFLOW_STATUS]: 'open',
    [ALERT_DEPTH]: depth,
    [ALERT_REASON]: reason,
    ...flattenWithPrefix(ALERT_RULE_NAMESPACE, mappedRule as RulesSchema),
  } as unknown as RACAlert;
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
  const originalTime = getValidDateFromDoc({
    doc,
    timestampOverride: undefined,
  });
  const additionalFields: Record<string, unknown> = {
    [ALERT_ORIGINAL_TIME]: originalTime != null ? originalTime.toISOString() : undefined,
    ...(thresholdResult != null ? { [ALERT_THRESHOLD_RESULT]: thresholdResult } : {}),
  };

  for (const [key, val] of Object.entries(doc._source ?? {})) {
    if (key.startsWith('event.')) {
      additionalFields[`${ALERT_ORIGINAL_EVENT}.${key.replace('event.', '')}`] = val;
    }
  }
  return additionalFields;
};
