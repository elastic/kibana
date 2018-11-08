/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import actionCreatorFactory from 'typescript-fsa';
import { Sort } from '../../../components/timeline/body/sort';

const actionCreator = actionCreatorFactory('x-pack/secops/local/timeline');

export const createTimeline = actionCreator<{ id: string }>('CREATE_TIMELINE');

export const updateSort = actionCreator<{ id: string; sort: Sort }>('UPDATE_SORT');

export const removeProvider = actionCreator<{ id: string; providerId: string }>('REMOVE_PROVIDER');
