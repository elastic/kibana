/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_UUID } from '@kbn/rule-data-utils';

import { Logger } from '@kbn/core/server';

import type { ConfigType } from '../../../../../config';
import { Ancestor, SignalSource, SignalSourceHit } from '../../../signals/types';
import { buildAlert, buildAncestors, generateAlertId } from './build_alert';
import { buildBulkBody } from './build_bulk_body';
import { EqlSequence } from '../../../../../../common/detection_engine/types';
import { generateBuildingBlockIds } from './generate_building_block_ids';
import { BuildReasonMessage } from '../../../signals/reason_formatters';
import { CompleteRule, RuleParams } from '../../../schemas/rule_schemas';
import {
  ALERT_BUILDING_BLOCK_TYPE,
  ALERT_GROUP_ID,
  ALERT_GROUP_INDEX,
} from '../../../../../../common/field_maps/field_names';
import {
  BaseFieldsLatest,
  EqlBuildingBlockFieldsLatest,
  EqlShellFieldsLatest,
  WrappedFieldsLatest,
} from '../../../../../../common/detection_engine/schemas/alerts';

/**
 * Takes N raw documents from ES that form a sequence and builds them into N+1 signals ready to be indexed -
 * one signal for each event in the sequence, and a "shell" signal that ties them all together. All N+1 signals
 * share the same signal.group.id to make it easy to query them.
 * @param sequence The raw ES documents that make up the sequence
 * @param completeRule object representing the rule that found the sequence
 */
export const buildAlertGroupFromSequence = (
  logger: Logger,
  sequence: EqlSequence<SignalSource>,
  completeRule: CompleteRule<RuleParams>,
  mergeStrategy: ConfigType['alertMergeStrategy'],
  spaceId: string | null | undefined,
  buildReasonMessage: BuildReasonMessage
): Array<WrappedFieldsLatest<EqlBuildingBlockFieldsLatest | EqlShellFieldsLatest>> => {
  const ancestors: Ancestor[] = sequence.events.flatMap((event) => buildAncestors(event));
  if (ancestors.some((ancestor) => ancestor?.rule === completeRule.alertId)) {
    return [];
  }

  // The "building block" alerts start out as regular BaseFields. We'll add the group ID and index fields
  // after creating the shell alert later on, since that's when the group ID is determined.
  let baseAlerts: BaseFieldsLatest[] = [];
  try {
    baseAlerts = sequence.events.map((event) =>
      buildBulkBody(spaceId, completeRule, event, mergeStrategy, [], false, buildReasonMessage)
    );
  } catch (error) {
    logger.error(error);
    return [];
  }

  // The ID of each building block alert depends on all of the other building blocks as well,
  // so we generate the IDs after making all the BaseFields
  const buildingBlockIds = generateBuildingBlockIds(baseAlerts);
  const wrappedBaseFields: Array<WrappedFieldsLatest<BaseFieldsLatest>> = baseAlerts.map(
    (block, i): WrappedFieldsLatest<BaseFieldsLatest> => ({
      _id: buildingBlockIds[i],
      _index: '',
      _source: {
        ...block,
        [ALERT_UUID]: buildingBlockIds[i],
      },
    })
  );

  // Now that we have an array of building blocks for the events in the sequence,
  // we can build the signal that links the building blocks together
  // and also insert the group id (which is also the "shell" signal _id) in each building block
  const shellAlert = buildAlertRoot(wrappedBaseFields, completeRule, spaceId, buildReasonMessage);
  const sequenceAlert: WrappedFieldsLatest<EqlShellFieldsLatest> = {
    _id: shellAlert[ALERT_UUID],
    _index: '',
    _source: shellAlert,
  };

  // Finally, we have the group id from the shell alert so we can convert the BaseFields into EqlBuildingBlocks
  const wrappedBuildingBlocks = wrappedBaseFields.map(
    (block, i): WrappedFieldsLatest<EqlBuildingBlockFieldsLatest> => ({
      ...block,
      _source: {
        ...block._source,
        [ALERT_BUILDING_BLOCK_TYPE]: 'default',
        [ALERT_GROUP_ID]: shellAlert[ALERT_GROUP_ID],
        [ALERT_GROUP_INDEX]: i,
      },
    })
  );

  return [...wrappedBuildingBlocks, sequenceAlert];
};

export const buildAlertRoot = (
  wrappedBuildingBlocks: Array<WrappedFieldsLatest<BaseFieldsLatest>>,
  completeRule: CompleteRule<RuleParams>,
  spaceId: string | null | undefined,
  buildReasonMessage: BuildReasonMessage
): EqlShellFieldsLatest => {
  const mergedAlerts = objectArrayIntersection(wrappedBuildingBlocks.map((alert) => alert._source));
  const reason = buildReasonMessage({
    name: completeRule.ruleConfig.name,
    severity: completeRule.ruleParams.severity,
    mergedDoc: mergedAlerts as SignalSourceHit,
  });
  const doc = buildAlert(wrappedBuildingBlocks, completeRule, spaceId, reason);
  const alertId = generateAlertId(doc);
  return {
    ...mergedAlerts,
    ...doc,
    [ALERT_UUID]: alertId,
    [ALERT_GROUP_ID]: alertId,
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
