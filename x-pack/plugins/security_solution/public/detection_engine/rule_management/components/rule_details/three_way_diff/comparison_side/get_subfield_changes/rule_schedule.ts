/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringifyToSortedJson } from '../utils';
import type { DiffableAllFields } from '../../../../../../../../common/api/detection_engine';
import type { SubfieldChange } from '../types';

export const getSubfieldChangesForRuleSchedule = (
  oldFieldValue?: DiffableAllFields['rule_schedule'],
  newFieldValue?: DiffableAllFields['rule_schedule']
): SubfieldChange[] => {
  const changes: SubfieldChange[] = [];

  if (oldFieldValue?.interval !== newFieldValue?.interval) {
    changes.push({
      subfieldName: 'interval',
      oldSubfieldValue: stringifyToSortedJson(oldFieldValue?.interval),
      newSubfieldValue: stringifyToSortedJson(newFieldValue?.interval),
    });
  }

  if (oldFieldValue?.lookback !== newFieldValue?.lookback) {
    changes.push({
      subfieldName: 'lookback',
      oldSubfieldValue: stringifyToSortedJson(oldFieldValue?.lookback),
      newSubfieldValue: stringifyToSortedJson(newFieldValue?.lookback),
    });
  }

  return changes;
};
