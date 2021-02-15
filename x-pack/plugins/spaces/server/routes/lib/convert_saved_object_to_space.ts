/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Space } from '../../../../../../src/plugins/spaces_oss/common';

export function convertSavedObjectToSpace(savedObject: any): Space {
  return {
    id: savedObject.id,
    ...savedObject.attributes,
  };
}
