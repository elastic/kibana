/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import actionCreatorFactory from 'typescript-fsa';

const actionCreator = actionCreatorFactory('x-pack/security_solution/local/global_url_param');

export const registerUrlParam = actionCreator<{ key: string; initialValue: string | null }>(
  'REGISTER_URL_PARAM'
);

export const deregisterUrlParam = actionCreator<{ key: string }>('DEREGISTER_URL_PARAM');

export const updateUrlParam = actionCreator<{ key: string; value: string | null }>(
  'UPDATE_URL_PARAM'
);
