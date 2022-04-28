/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useReducer, Dispatch } from 'react';
import { merge } from 'lodash';
import { DEFAULT_FEATURES } from '../../../common/constants';
import { DEFAULT_BASE_PATH } from '../../common/navigation';
import { useApplication } from './use_application';
import {
  CasesContextStoreAction,
  casesContextReducer,
  getInitialCasesContextState,
} from './cases_context_reducer';
import { CasesFeaturesAllRequired, CasesFeatures } from '../../containers/types';
import { CasesGlobalComponents } from './cases_global_components';
import { ReleasePhase } from '../types';

export type CasesContextValueDispatch = Dispatch<CasesContextStoreAction>;

export interface CasesContextValue {
  owner: string[];
  appId: string;
  appTitle: string;
  userCanCrud: boolean;
  basePath: string;
  features: CasesFeaturesAllRequired;
  releasePhase: ReleasePhase;
  dispatch: CasesContextValueDispatch;
}

export interface CasesContextProps extends Pick<CasesContextValue, 'owner' | 'userCanCrud'> {
  basePath?: string;
  features?: CasesFeatures;
  releasePhase?: ReleasePhase;
}

export const CasesContext = React.createContext<CasesContextValue | undefined>(undefined);

export interface CasesContextStateValue extends Omit<CasesContextValue, 'appId' | 'appTitle'> {
  appId?: string;
  appTitle?: string;
}

export const CasesProvider: React.FC<{ value: CasesContextProps }> = ({
  children,
  value: { owner, userCanCrud, basePath = DEFAULT_BASE_PATH, features = {}, releasePhase = 'ga' },
}) => {
  const { appId, appTitle } = useApplication();
  const [state, dispatch] = useReducer(casesContextReducer, getInitialCasesContextState());
  const [value, setValue] = useState<CasesContextStateValue>(() => ({
    owner,
    userCanCrud,
    basePath,
    /**
     * The empty object at the beginning avoids the mutation
     * of the DEFAULT_FEATURES object
     */
    features: merge<object, CasesFeaturesAllRequired, CasesFeatures>(
      {},
      DEFAULT_FEATURES,
      features
    ),
    releasePhase,
    dispatch,
  }));

  /**
   * `userCanCrud` prop may change by the parent plugin.
   * `appId` and `appTitle` are dynamically retrieved from kibana context.
   * We need to update the state if any of these values change, the rest of props are never updated.
   */
  useEffect(() => {
    if (appId && appTitle) {
      setValue((prev) => ({
        ...prev,
        appId,
        appTitle,
        userCanCrud,
      }));
    }
  }, [appTitle, appId, userCanCrud]);

  return isCasesContextValue(value) ? (
    <CasesContext.Provider value={value}>
      <CasesGlobalComponents state={state} />
      {children}
    </CasesContext.Provider>
  ) : null;
};
CasesProvider.displayName = 'CasesProvider';

function isCasesContextValue(value: CasesContextStateValue): value is CasesContextValue {
  return value.appId != null && value.appTitle != null && value.userCanCrud != null;
}

// eslint-disable-next-line import/no-default-export
export default CasesProvider;
