/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Operator } from '../components/exception_builder/types';

export const getMockNewExceptionItem = (exceptionItemId: string) => ({
  id: null,
  list_id: 'endpoint_list',
  item_id: exceptionItemId,
  _tags: ['endpoint'],
  tags: [],
  type: 'simple',
  name: 'Sample Endpoint Exception Item',
  entries: [
    {
      field: '',
      operator: 'included' as Operator.INCLUSION,
      match: '',
    },
  ],
});

export const getMockExceptionItem = (exceptionItemId: string) => ({
  id: '1asdf2323df989',
  list_id: 'endpoint_list',
  item_id: exceptionItemId,
  _tags: ['endpoint', 'process', 'malware', 'os:linux'],
  tags: ['user added string for a tag', 'malware'],
  type: 'simple',
  description: 'This is a sample endpoint type exception',
  name: 'Sample Endpoint Exception List',
  entries: [
    {
      field: 'actingProcess.file.signer',
      operator: 'included' as Operator.INCLUSION,
      match: 'Elastic, N.V.',
    },
    {
      field: 'event.category',
      operator: 'included' as Operator.INCLUSION,
      match_any: ['process', 'malware'],
    },
  ],
});
