/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { actionCreatorFactory } from '../lib/action_creator';

// TODO: Type return value
export const actions = {
  serverReturnedBootstrapData: actionCreatorFactory<'serverReturnedBootstrapData', [any]>(
    'serverReturnedBootstrapData'
  ),
};

export type HomeAction = ReturnType<typeof actions.serverReturnedBootstrapData>;
