/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  CreateExceptionListItemSchemaPartial,
  CreateExceptionListSchemaPartial,
} from '../../common/schemas';

export const mockNewExceptionList: CreateExceptionListSchemaPartial = {
  _tags: ['endpoint', 'process', 'malware', 'os:linux'],
  description: 'This is a sample endpoint type exception',
  list_id: 'endpoint_list',
  name: 'Sample Endpoint Exception List',
  tags: ['user added string for a tag', 'malware'],
  type: 'endpoint',
};

export const mockNewExceptionItem: CreateExceptionListItemSchemaPartial = {
  _tags: ['endpoint', 'process', 'malware', 'os:linux'],
  description: 'This is a sample endpoint type exception',
  entries: [
    {
      field: 'actingProcess.file.signer',
      match: 'Elastic, N.V.',
      match_any: undefined,
      operator: 'included',
    },
    {
      field: 'event.category',
      match: undefined,
      match_any: ['process', 'malware'],
      operator: 'included',
    },
  ],
  item_id: 'endpoint_list_item',
  list_id: 'endpoint_list',
  name: 'Sample Endpoint Exception List',
  tags: ['user added string for a tag', 'malware'],
  type: 'simple',
};
