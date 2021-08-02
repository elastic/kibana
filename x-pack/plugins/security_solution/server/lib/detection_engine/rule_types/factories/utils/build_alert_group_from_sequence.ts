/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject } from 'src/core/types';
import type { ConfigType } from '../../../../../config';
import { buildRuleWithoutOverrides } from '../../../signals/build_rule';
import { AlertAttributes, SignalSource } from '../../../signals/types';
import { generateId } from '../../../signals/utils';
import { RACAlert, WrappedRACAlert } from '../../types';
import { buildAlert } from './build_alert';
import { buildBulkBody } from './build_bulk_body';
import { EqlSequence } from '../../../../../../common/detection_engine/types';
import { generateBuildingBlockIds } from './generate_building_block_ids';

/**
 * Takes N raw documents from ES that form a sequence and builds them into N+1 signals ready to be indexed -
 * one signal for each event in the sequence, and a "shell" signal that ties them all together. All N+1 signals
 * share the same signal.group.id to make it easy to query them.
 * @param sequence The raw ES documents that make up the sequence
 * @param ruleSO SavedObject representing the rule that found the sequence
 */
export const buildAlertGroupFromSequence = (
  sequence: EqlSequence<SignalSource>,
  ruleSO: SavedObject<AlertAttributes>,
  mergeStrategy: ConfigType['alertMergeStrategy']
): WrappedRACAlert[] => {
  const ancestors = sequence.events.flatMap((event) => event._source.signal?.ancestors ?? []);
  if (ancestors.some((ancestor) => ancestor.rule === ruleSO.id)) {
    return [];
  }

  const buildingBlocks: RACAlert[] = sequence.events.map((event) => ({
    ...buildBulkBody(ruleSO, event, mergeStrategy, false),
    'kibana.alert.rule.building_block_type': 'default',
  }));
  const buildingBlockIds = generateBuildingBlockIds(buildingBlocks);
  const wrappedBuildingBlocks: WrappedRACAlert[] = buildingBlocks.map((block, i) => ({
    _id: buildingBlockIds[i],
    _index: '',
    _source: {
      ...block,
    },
  }));

  // Now that we have an array of building blocks for the events in the sequence,
  // we can build the signal that links the building blocks together
  // and also insert the group id (which is also the "shell" signal _id) in each building block
  const doc = buildAlertFromSequence(wrappedBuildingBlocks, ruleSO);
  const sequenceAlert = {
    _id: generateId(
      '',
      doc['kibana.alert.id'] as string,
      '',
      ruleSO.attributes.params.ruleId ?? ''
    ),
    _index: '',
    _source: doc,
  };

  wrappedBuildingBlocks.forEach((block, idx) => {
    block._source['kibana.alert.group'] = {
      id: sequenceAlert._id,
      index: '',
    };
  });

  return [...wrappedBuildingBlocks, sequenceAlert];
};

export const buildAlertFromSequence = (
  alerts: WrappedRACAlert[],
  ruleSO: SavedObject<AlertAttributes>
): RACAlert => {
  const rule = buildRuleWithoutOverrides(ruleSO);
  const doc = buildAlert(alerts, rule);
  const mergedAlerts = objectArrayIntersection(alerts.map((alert) => alert._source));
  return {
    ...mergedAlerts,
    event: {
      kind: 'signal',
    },
    ...doc,
  };
};

export const objectArrayIntersection = (objects: object[]) => {
  if (objects.length === 0) {
    return undefined;
  } else if (objects.length === 1) {
    return objects[0];
  } else {
    return objects
      .slice(1)
      .reduce(
        (acc: object | undefined, obj): object | undefined => objectPairIntersection(acc, obj),
        objects[0]
      );
  }
};

export const objectPairIntersection = (a: object | undefined, b: object | undefined) => {
  if (a === undefined || b === undefined) {
    return undefined;
  }
  const intersection: Record<string, unknown> = {};
  Object.entries(a).forEach(([key, aVal]) => {
    if (key in b) {
      const bVal = (b as Record<string, unknown>)[key];
      if (
        typeof aVal === 'object' &&
        !(aVal instanceof Array) &&
        aVal !== null &&
        typeof bVal === 'object' &&
        !(bVal instanceof Array) &&
        bVal !== null
      ) {
        intersection[key] = objectPairIntersection(aVal, bVal);
      } else if (aVal === bVal) {
        intersection[key] = aVal;
      }
    }
  });
  // Count up the number of entries that are NOT undefined in the intersection
  // If there are no keys OR all entries are undefined, return undefined
  if (
    Object.values(intersection).reduce(
      (acc: number, value) => (value !== undefined ? acc + 1 : acc),
      0
    ) === 0
  ) {
    return undefined;
  } else {
    return intersection;
  }
};
