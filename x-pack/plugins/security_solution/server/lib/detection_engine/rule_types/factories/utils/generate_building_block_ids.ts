/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import { createHash } from 'crypto';
import { ALERT_ANCESTORS } from '../../../../../../common/field_maps/field_names';
import { Ancestor } from '../../../signals/types';
import { RACAlert } from '../../types';

/**
 * Generates unique doc ids for each building block signal within a sequence. The id of each building block
 * depends on the parents of every building block, so that a signal which appears in multiple different sequences
 * (e.g. if multiple rules build sequences that share a common event/signal) will get a unique id per sequence.
 * @param buildingBlocks The full list of building blocks in the sequence.
 */
export const generateBuildingBlockIds = (buildingBlocks: RACAlert[]): string[] => {
  const baseHashString = buildingBlocks.reduce(
    (baseString, block) =>
      baseString
        .concat(
          (block[ALERT_ANCESTORS] as Ancestor[]).reduce(
            (acc, ancestor) => acc.concat(ancestor.id, ancestor.index),
            ''
          )
        )
        .concat(block[ALERT_RULE_UUID] as string),
    ''
  );
  return buildingBlocks.map((block, idx) =>
    createHash('sha256').update(baseHashString).update(String(idx)).digest('hex')
  );
};
