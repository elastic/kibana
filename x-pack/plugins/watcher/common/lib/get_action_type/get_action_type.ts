/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { intersection, keys, values } from 'lodash';
import { ACTION_TYPES } from '../../constants';

export function getActionType(action: { [key: string]: { [key: string]: any } }) {
  const type = intersection(keys(action), values(ACTION_TYPES))[0] || ACTION_TYPES.UNKNOWN;

  return type;
}
