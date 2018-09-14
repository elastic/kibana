/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { Space } from './model/space';

/**
 * Returns whether the given Space is reserved or not.
 *
 * @param space the space
 * @returns boolean
 */
export function isReservedSpace(space?: Partial<Space> | null): boolean {
  return get(space, '_reserved', false);
}
