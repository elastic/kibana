/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Tag, TagSavedObject } from '../../common/types';

export const savedObjectToTag = (savedObject: TagSavedObject): Tag => {
  return {
    id: savedObject.id,
    ...savedObject.attributes,
  };
};
