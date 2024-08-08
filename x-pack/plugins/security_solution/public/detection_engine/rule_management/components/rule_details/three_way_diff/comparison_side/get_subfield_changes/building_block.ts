/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringifyToSortedJson } from '../utils';
import type { DiffableAllFields } from '../../../../../../../../common/api/detection_engine';
import type { SubfieldChange } from '../types';

export const getSubfieldChangesForBuildingBlock = (
  oldFieldValue?: DiffableAllFields['building_block'],
  newFieldValue?: DiffableAllFields['building_block']
): SubfieldChange[] => {
  const oldType = stringifyToSortedJson(oldFieldValue?.type);
  const newType = stringifyToSortedJson(newFieldValue?.type);

  if (oldType !== newType) {
    return [
      {
        subfieldName: 'type',
        oldSubfieldValue: oldType,
        newSubfieldValue: newType,
      },
    ];
  }

  return [];
};
