/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectReference } from '../../../../src/core/types';
import { tagSavedObjectTypeName } from './constants';

/**
 * Create a {@link SavedObjectReference | reference} for given tag id.
 */
export const tagIdToReference = (tagId: string): SavedObjectReference => ({
  type: tagSavedObjectTypeName,
  id: tagId,
  name: `tag-ref-${tagId}`,
});
