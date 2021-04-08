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
import { EventFiltersListPageState } from '../state';

import { CreateExceptionListItemSchema } from '../../../../../public/shared_imports';
import { Ecs } from '../../../../../common/ecs';
import { addIdToItem } from '../../../../../common';

import {
  MANAGEMENT_STORE_EVENT_FILTERS_NAMESPACE as EVENT_FILTERS_NS,
  MANAGEMENT_STORE_GLOBAL_NAMESPACE as GLOBAL_NS,
} from '../../../common/constants';

export function useEventFiltersSelector<R>(selector: (state: EventFiltersListPageState) => R): R {
  return useSelector((state: State) =>
    selector(state[GLOBAL_NS][EVENT_FILTERS_NS] as EventFiltersListPageState)
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
              addIdToItem({
                field: 'event.category',
                operator: 'included',
                type: 'match',
                value: (data.event.category ?? [])[0],
              }),
              addIdToItem({
                field: 'process.executable',
                operator: 'included',
                type: 'match',
                value: (data.process.executable ?? [])[0],
              }),
            ]
          : [],
      item_id: undefined,
      list_id: 'as',
      meta: {
        temporaryUuid: uuid.v4(),
      },
      name: '',
      namespace_type: 'agnostic',
      tags: [],
      type: 'simple',
    }),
    [data]
  );
}
