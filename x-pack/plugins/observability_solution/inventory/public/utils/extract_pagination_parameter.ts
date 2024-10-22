/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isRight } from 'fp-ts/lib/Either';
import { type EntityPagination, entityPaginationRt } from '../../common/entities';

export function extractPaginationParameter(queryParam?: string): EntityPagination | undefined {
  if (queryParam === undefined) {
    return undefined;
  }

  const pagination = entityPaginationRt.decode(queryParam);

  if (isRight(pagination)) {
    return pagination.right;
  } else {
    throw new Error('Invalid pagination object', { cause: pagination.left });
  }
}
