/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import actionCreatorFactory from 'typescript-fsa';

const actionCreator = actionCreatorFactory('x-pack/infra/local/log_minimap');

export const setMinimapIntervalSize = actionCreator<number>('SET_MINIMAP_INTERVAL_SIZE');
