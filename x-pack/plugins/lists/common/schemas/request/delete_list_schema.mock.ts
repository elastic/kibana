/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LIST_ID } from '../../constants.mock';

import { DeleteListSchema } from './delete_list_schema';

export const getDeleteListSchemaMock = (): DeleteListSchema => ({
  id: LIST_ID,
});
