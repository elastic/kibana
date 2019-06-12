/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BaseOptions } from 'src/legacy/server/saved_objects';
import { DEFAULT_SPACE_ID } from '../../../common/constants';

export function getNamespace(
  operationOptions: BaseOptions,
  currentSpaceId: string
): string | undefined {
  if (operationOptions.hasOwnProperty('namespace')) {
    return operationOptions.namespace;
  }
  if (currentSpaceId === DEFAULT_SPACE_ID) {
    return undefined;
  }
  return currentSpaceId;
}
