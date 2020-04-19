/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CreateListsSchema } from '../create_lists_schema';

export const getListRequest = (): CreateListsSchema => ({
  name: 'Name of a list item',
  description: 'Description of a list item',
  id: 'some-list-id',
  type: 'ip',
  meta: undefined,
});
