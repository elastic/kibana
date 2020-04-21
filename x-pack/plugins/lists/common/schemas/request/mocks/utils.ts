/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CreateListSchema } from '../create_list_schema';

export const getListRequest = (): CreateListSchema => ({
  description: 'Description of a list item',
  id: 'some-list-id',
  meta: undefined,
  name: 'Name of a list item',
  type: 'ip',
});
