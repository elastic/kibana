/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { noop } from 'lodash';
import { emptySerializer } from '../helper';
import { ReactiveConfigs } from './initialize_observables';
import { GetStateType } from '../types';

export function initializeData(
  getState: GetStateType,
  { dataLoading$ }: ReactiveConfigs['variables']
) {
  return {
    api: {
      dataLoading: dataLoading$,
      serializeState: () => ({ rawState: getState(), references: [] }),
    },
    comparators: {},
    cleanup: noop,
    serialize: emptySerializer,
  };
}
