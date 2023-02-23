/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  BULK_GET_USER_PROFILES_API_TAG,
  constructHttpOperationTag,
  SUGGEST_USER_PROFILES_API_TAG,
} from '../constants';
import { Operation } from '../constants/types';
import type { Owner } from '../constants/types';

export const getApiTags = (owner: Owner) => {
  const create = constructHttpOperationTag(owner, Operation.Create);
  const update = constructHttpOperationTag(owner, Operation.Update);
  const deleteTag = constructHttpOperationTag(owner, Operation.Delete);
  const read = constructHttpOperationTag(owner, Operation.Read);

  return {
    all: [
      SUGGEST_USER_PROFILES_API_TAG,
      BULK_GET_USER_PROFILES_API_TAG,
      create,
      update,
      read,
    ] as const,
    read: [SUGGEST_USER_PROFILES_API_TAG, BULK_GET_USER_PROFILES_API_TAG, read] as const,
    delete: [deleteTag] as const,
  };
};
