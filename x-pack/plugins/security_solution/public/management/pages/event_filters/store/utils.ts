/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import { CreateExceptionListItemSchema } from '../../../../shared_imports';
import { Ecs } from '../../../../../common/ecs';
import { ENDPOINT_EVENT_FILTERS_LIST_ID } from '../constants';

export const getInitialExceptionFromEvent = (data?: Ecs): CreateExceptionListItemSchema => ({
  comments: [],
  description: '',
  entries:
    data && data.event && data.process
      ? [
          {
            field: 'event.category',
            operator: 'included',
            type: 'match',
            value: (data.event.category ?? [])[0],
          },
          {
            field: 'process.executable',
            operator: 'included',
            type: 'match',
            value: (data.process.executable ?? [])[0],
          },
        ]
      : [
          {
            field: '',
            operator: 'included',
            type: 'match',
            value: '',
          },
        ],
  item_id: undefined,
  list_id: ENDPOINT_EVENT_FILTERS_LIST_ID,
  meta: {
    temporaryUuid: uuid.v4(),
  },
  name: '',
  namespace_type: 'agnostic',
  tags: ['policy:all'],
  type: 'simple',
  // TODO: Try to fix this type casting
  os_types: [
    (data && data.host ? data.host.os?.family ?? ['windows'] : ['windows'])[0] as
      | 'windows'
      | 'linux'
      | 'macos',
  ],
});
