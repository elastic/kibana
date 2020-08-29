/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kea } from 'kea';

import { IInitialAppData } from '../../../common/types';
import { IKeaLogic } from '../shared/types';

export interface IAppLogicValues {
  hasInitialized: boolean;
}
export interface IAppLogicActions {
  initializeAppData(props: IInitialAppData): void;
}

export const AppLogic = kea({
  actions: (): IAppLogicActions => ({
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
}) as IKeaLogic<IAppLogicValues, IAppLogicActions>;
