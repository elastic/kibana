/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import actionCreatorFactory from 'typescript-fsa';

import { FilterQuery } from './reducer';

const actionCreator = actionCreatorFactory('x-pack/infra/local/log_filter');

export const setLogFilterQueryDraft = actionCreator<FilterQuery>('SET_LOG_FILTER_QUERY_DRAFT');

export const applyLogFilterQuery = actionCreator<FilterQuery>('APPLY_LOG_FILTER_QUERY');
