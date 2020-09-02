/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kea, MakeLogicType } from 'kea';

import { IInitialAppData } from '../../../common/types';
import { IWorkplaceSearchInitialData } from '../../../common/types/workplace_search';

export interface IAppValues extends IWorkplaceSearchInitialData {
  hasInitialized: boolean;
}
export interface IAppActions {
  initializeAppData(props: IInitialAppData): void;
}

export const AppLogic = kea<MakeLogicType<IAppValues, IAppActions>>({
  actions: {
    initializeAppData: ({ workplaceSearch }) => workplaceSearch,
  },
  reducers: {
    hasInitialized: [
      false,
      {
        initializeAppData: () => true,
      },
    ],
  },
});
