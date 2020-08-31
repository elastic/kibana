/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { inputsActions } from '../../store/actions';

export type SetQuery = Pick<
  Parameters<typeof inputsActions.setQuery>[0],
  'id' | 'inspect' | 'loading' | 'refetch'
>;

export type DeleteQuery = Pick<Parameters<typeof inputsActions.deleteOneQuery>[0], 'id'>;
