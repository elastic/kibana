/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import actionCreatorFactory from 'typescript-fsa';

const actionCreator = actionCreatorFactory('kibana/logging/search');

/**
 * SEARCH
 */

export const search = actionCreator<string>('SEARCH');

/**
 * CLEAR_SEARCH
 */

export const clearSearch = actionCreator('CLEAR_SEARCH');
