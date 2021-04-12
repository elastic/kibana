/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import { useSelector } from 'react-redux';
import uuid from 'uuid';

import { State } from '../../../../common/store';
import { EventFilterListPageState } from '../state';

import { CreateExceptionListItemSchema } from '../../../../../public/shared_imports';
import { Ecs } from '../../../../../common/ecs';

import {
  MANAGEMENT_STORE_EVENT_FILTER_NAMESPACE as EVENT_FILTER_NS,
  MANAGEMENT_STORE_GLOBAL_NAMESPACE as GLOBAL_NS,
} from '../../../common/constants';
import { EVENT_FILTER_LIST_ID } from '../constants';

export function useEventFilterSelector<R>(selector: (state: EventFilterListPageState) => R): R {
  return useSelector((state: State) =>
    selector(state[GLOBAL_NS][EVENT_FILTER_NS] as EventFilterListPageState)
  );
}

export function useGetInitialExceptionFromEvent(data: Ecs): CreateExceptionListItemSchema {
  return useMemo(
    () => ({
      comments: [],
      description: '',
      entries:
        data.event && data.process
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
          : [],
      item_id: undefined,
      list_id: EVENT_FILTER_LIST_ID,
      meta: {
        temporaryUuid: uuid.v4(),
      },
      name: '',
      namespace_type: 'agnostic',
      tags: [],
      type: 'simple',
      // TODO: Try to fix this type casting
      os_types: [(data.host ? data.host.os?.family ?? [] : [])[0] as 'windows' | 'linux' | 'macos'],
    }),
    [data]
  );
}
