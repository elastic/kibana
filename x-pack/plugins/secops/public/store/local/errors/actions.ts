/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import actionCreatorFactory from 'typescript-fsa';

const actionCreator = actionCreatorFactory('x-pack/secops/local/hosts');

export const addError = actionCreator<{ id: string; title: string; message: string }>(
  'UPDATE_ERRORS'
);

export const removeError = actionCreator<{ id: string }>('REMOVE_ERRORS');
