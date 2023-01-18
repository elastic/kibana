/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuid } from 'uuid';
import type { CreateExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import type { Ecs } from '../../../../../common/ecs';
import { ENDPOINT_EVENT_FILTERS_LIST_ID } from '../constants';

const osTypeBasedOnAgentType = (data?: Ecs) => {
  if (data?.agent?.type?.includes('endpoint')) {
    return (data?.host?.os?.name || ['windows']).map((name) => name.toLowerCase());
  } else {
    return data?.host?.os?.family ?? ['windows'];
  }
};

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
  os_types: osTypeBasedOnAgentType(data) as Array<'windows' | 'linux' | 'macos'>,
});
