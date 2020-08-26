/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kea } from 'kea';

import { IInitialAppData } from '../../../common/types';
import { IKeaLogic } from '../shared/types';

export interface IAppValues {
  hasInitialized: boolean;
}
export interface IAppActions {
  initializeAppData(props: IInitialAppData): void;
}

export const AppLogic = kea({
  actions: (): IAppActions => ({
    initializeAppData: (props) => props,
  }),
  reducers: () => ({
    hasInitialized: [
      false,
      {
        initializeAppData: () => true,
      },
    ],
  }),
}) as IKeaLogic<IAppValues, IAppActions>;
