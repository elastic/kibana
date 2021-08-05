/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_OWNER,
  ALERT_RULE_NAMESPACE,
  ALERT_STATUS,
  ALERT_WORKFLOW_STATUS,
  SPACE_IDS,
} from '@kbn/rule-data-utils';
import { RulesSchema } from '../../../../../../common/detection_engine/schemas/response/rules_schema';
import { isEventTypeSignal } from '../../../signals/build_event_type_signal';
import { Ancestor, BaseSignalHit, SimpleHit } from '../../../signals/types';
import {
  getField,
  getValidDateFromDoc,
  isWrappedRACAlert,
  isWrappedSignalHit,
} from '../../../signals/utils';
import { invariant } from '../../../../../../common/utils/invariant';
import { RACAlert } from '../../types';
import { flattenWithPrefix } from './flatten_with_prefix';
import {
  ALERT_ANCESTORS,
  ALERT_DEPTH,
  ALERT_ORIGINAL_EVENT,
  ALERT_ORIGINAL_TIME,
} from '../../field_maps/field_names';
import { SERVER_APP_ID } from '../../../../../../common/constants';

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
    depth: isSignal ? getField(doc, 'signal.depth') ?? 1 : 0,
  };
  if (isSignal) {
    parent.rule = getField(doc, 'signal.rule.id');
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
  const existingAncestors: Ancestor[] = getField(doc, 'signal.ancestors') ?? [];
  return [...existingAncestors, newAncestor];
};

/**
 * This removes any alert name clashes such as if a source index has
 * "signal" but is not a signal object we put onto the object. If this
 * is our "signal object" then we don't want to remove it.
 * @param doc The source index doc to a signal.
 */
export const removeClashes = (doc: SimpleHit) => {
  if (isWrappedSignalHit(doc)) {
    invariant(doc._source, '_source field not found');
    const { signal, ...noSignal } = doc._source;
    if (signal == null || isEventTypeSignal(doc)) {
      return doc;
    } else {
      return {
        ...doc,
        _source: { ...noSignal },
      };
    }
  }
  return doc;
};

/**
 * Builds the `kibana.alert.*` fields that are common across all alerts.
 * @param docs The parent alerts/events of the new alert to be built.
 * @param rule The rule that is generating the new alert.
 */
export const buildAlert = (
  docs: SimpleHit[],
  rule: RulesSchema,
  spaceId: string | null | undefined
): RACAlert => {
  const removedClashes = docs.map(removeClashes);
  const parents = removedClashes.map(buildParent);
  const depth = parents.reduce((acc, parent) => Math.max(parent.depth, acc), 0) + 1;
  const ancestors = removedClashes.reduce(
    (acc: Ancestor[], doc) => acc.concat(buildAncestors(doc)),
    []
  );

  return ({
    '@timestamp': new Date().toISOString(),
    [ALERT_OWNER]: SERVER_APP_ID,
    [SPACE_IDS]: spaceId != null ? [spaceId] : [],
    [ALERT_ANCESTORS]: ancestors,
    [ALERT_STATUS]: 'open',
    [ALERT_WORKFLOW_STATUS]: 'open',
    [ALERT_DEPTH]: depth,
    ...flattenWithPrefix(ALERT_RULE_NAMESPACE, rule),
  } as unknown) as RACAlert;
};

/**
 * Creates signal fields that are only available in the special case where a signal has only 1 parent signal/event.
 * We copy the original time from the document as "original_time" since we override the timestamp with the current date time.
 * @param doc The parent signal/event of the new signal to be built.
 */
export const additionalAlertFields = (doc: BaseSignalHit) => {
  const originalTime = getValidDateFromDoc({
    doc,
    timestampOverride: undefined,
  });
  const additionalFields: Record<string, unknown> = {
    [ALERT_ORIGINAL_TIME]: originalTime != null ? originalTime.toISOString() : undefined,
  };
  const event = doc._source?.event;
  if (event != null) {
    additionalFields[ALERT_ORIGINAL_EVENT] = event;
  }
  return additionalFields;
};
