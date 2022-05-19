/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set } from '@elastic/safer-lodash-set';
import { get } from 'lodash/fp';
import { Ecs } from '../../../../../common/ecs';
import { Fields } from '../../../../../common/search_strategy';
import { toStringArray } from '../../../../../common/utils/to_array';

export const buildObjectRecursive = (fieldPath: string, fields: Fields): Partial<Ecs> => {
  return set({}, fieldPath, toStringArray(get(fieldPath, fields)));
};
