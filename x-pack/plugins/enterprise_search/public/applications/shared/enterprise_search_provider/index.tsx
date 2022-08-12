/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createContext, FC, useContext } from 'react';

import { InitialAppData } from '../../../../common/types';

import { NO_ACCESS } from './constants';

export interface EnterpriseSearchContextData {
  initialData: InitialAppData;
}
const initialContextWithNoAccess: EnterpriseSearchContextData = {
  initialData: {
    access: NO_ACCESS,
  },
};

const EnterpriseSearchContext = createContext<EnterpriseSearchContextData>(
  initialContextWithNoAccess
);

export const EnterpriseSearchProvider: FC<EnterpriseSearchContextData> = ({
  children,
  ...data
}) => <EnterpriseSearchContext.Provider value={data}>{children}</EnterpriseSearchContext.Provider>;

/**
 * React hook for accessing the pre-wired `EnterpriseSearchContextData`.
 */
export function useEnterpriseSearchData() {
  return useContext(EnterpriseSearchContext);
}
