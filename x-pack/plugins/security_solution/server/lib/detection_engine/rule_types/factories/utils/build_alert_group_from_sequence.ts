/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject } from 'src/core/types';
import type { ConfigType } from '../../../../../config';
import { buildRuleWithoutOverrides } from '../../../signals/build_rule';
import { AlertAttributes, Ancestor, SignalSource } from '../../../signals/types';
import { RACAlert, WrappedRACAlert } from '../../types';
import { buildAlert, buildAncestors, generateAlertId } from './build_alert';
import { buildBulkBody } from './build_bulk_body';
import { EqlSequence } from '../../../../../../common/detection_engine/types';
import { generateBuildingBlockIds } from './generate_building_block_ids';
import { objectArrayIntersection } from '../../../signals/build_bulk_body';

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
  mergeStrategy: ConfigType['alertMergeStrategy'],
  spaceId: string | null | undefined
): WrappedRACAlert[] => {
  const ancestors: Ancestor[] = sequence.events.flatMap((event) => buildAncestors(event));
  if (ancestors.some((ancestor) => ancestor?.rule === ruleSO.id)) {
    return [];
  }

  const buildingBlocks: RACAlert[] = sequence.events.map((event) => ({
    ...buildBulkBody(spaceId, ruleSO, event, mergeStrategy, false),
    'kibana.alert.building_block_type': 'default',
  }));

  const buildingBlockIds = generateBuildingBlockIds(buildingBlocks);
  const wrappedBuildingBlocks: WrappedRACAlert[] = buildingBlocks.map((block, i) => ({
    _id: buildingBlockIds[i],
    _index: '', // TODO: output index
    _source: {
      ...block,
    },
  }));

  // Now that we have an array of building blocks for the events in the sequence,
  // we can build the signal that links the building blocks together
  // and also insert the group id (which is also the "shell" signal _id) in each building block
  const doc = buildAlertFromSequence(wrappedBuildingBlocks, ruleSO, spaceId);
  const sequenceAlert = {
    _id: generateAlertId(doc),
    _index: '', // TODO: output index
    _source: doc,
  };

  wrappedBuildingBlocks.forEach((block) => {
    block._source['kibana.alert.group'] = {
      id: sequenceAlert._id,
      index: '',
    };
  });

  return [...wrappedBuildingBlocks, sequenceAlert];
};

export const buildAlertFromSequence = (
  alerts: WrappedRACAlert[],
  ruleSO: SavedObject<AlertAttributes>,
  spaceId: string | null | undefined
): RACAlert => {
  const rule = buildRuleWithoutOverrides(ruleSO);
  const doc = buildAlert(alerts, rule, spaceId);
  const mergedAlerts = objectArrayIntersection(alerts.map((alert) => alert._source));
  return {
    ...mergedAlerts,
    event: {
      kind: 'signal',
    },
    ...doc,
  };
};
