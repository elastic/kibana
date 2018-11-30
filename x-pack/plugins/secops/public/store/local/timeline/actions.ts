/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import actionCreatorFactory from 'typescript-fsa';
import { Range } from '../../../components/timeline/body/column_headers/range_picker/ranges';
import { Sort } from '../../../components/timeline/body/sort';
import { DataProvider } from '../../../components/timeline/data_providers/data_provider';
import { ECS } from '../../../components/timeline/ecs';

const actionCreator = actionCreatorFactory('x-pack/secops/local/timeline');

export const addProvider = actionCreator<{ id: string; provider: DataProvider }>('ADD_PROVIDER');

export const createTimeline = actionCreator<{ id: string }>('CREATE_TIMELINE');

export const updateData = actionCreator<{ id: string; data: ECS[] }>('UPDATE_DATA');

export const updateProviders = actionCreator<{ id: string; providers: DataProvider[] }>(
  'UPDATE_PROVIDERS'
);

export const updateRange = actionCreator<{ id: string; range: Range }>('UPDATE_RANGE');

export const updateSort = actionCreator<{ id: string; sort: Sort }>('UPDATE_SORT');

export const removeProvider = actionCreator<{ id: string; providerId: string }>('REMOVE_PROVIDER');

export const showTimeline = actionCreator<{ id: string; show: boolean }>('SHOW_TIMELINE');
