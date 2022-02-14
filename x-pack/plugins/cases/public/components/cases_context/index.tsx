/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useReducer, useMemo } from 'react';
import { merge } from 'lodash';
import { DEFAULT_FEATURES } from '../../../common/constants';
import { DEFAULT_BASE_PATH } from '../../common/navigation';
import { useApplication } from './use_application';
import {
  CasesContextStoreAction,
  casesContextReducer,
  CasesContextState,
  initialCasesContextState,
} from './cases_context_reducer';
import { CasesContextFeatures, CasesFeatures } from '../../containers/types';
import { CasesContextUI } from './cases_context_ui';

export interface CasesContextValue {
  owner: string[];
  appId: string;
  appTitle: string;
  userCanCrud: boolean;
  basePath: string;
  features: CasesContextFeatures;
  state: CasesContextState;
  dispatch: (action: CasesContextStoreAction) => void;
}

export interface CasesContextProps extends Pick<CasesContextValue, 'owner' | 'userCanCrud'> {
  basePath?: string;
  features?: CasesFeatures;
}

export const CasesContext = React.createContext<CasesContextValue | undefined>(undefined);

export interface CasesContextStateValue extends Omit<CasesContextValue, 'appId' | 'appTitle'> {
  appId?: string;
  appTitle?: string;
}

export const CasesProvider: React.FC<{ value: CasesContextProps }> = ({
  children,
  value: { owner, userCanCrud, basePath = DEFAULT_BASE_PATH, features = {} },
}) => {
  const { appId, appTitle } = useApplication();
  const [state, dispatch] = useReducer(casesContextReducer, initialCasesContextState());
  const [baseValue, setBaseValue] = useState<Omit<CasesContextStateValue, 'state' | 'dispatch'>>(
    () => ({
      owner,
      userCanCrud,
      basePath,
      /**
       * The empty object at the beginning avoids the mutation
       * of the DEFAULT_FEATURES object
       */
      features: merge({}, DEFAULT_FEATURES, features),
    })
  );

  /**
   * `userCanCrud` prop may change by the parent plugin.
   * `appId` and `appTitle` are dynamically retrieved from kibana context.
   * We need to update the state if any of these values change, the rest of props are never updated.
   */
  useEffect(() => {
    if (appId && appTitle) {
      setBaseValue((prev) => ({
        ...prev,
        appId,
        appTitle,
        userCanCrud,
      }));
    }
  }, [appTitle, appId, userCanCrud]);

  const value = useMemo(() => {
    return { ...baseValue, state, dispatch };
  }, [baseValue, state]);

  return isCasesContextValue(value) ? (
    <CasesContext.Provider value={value}>
      <CasesContextUI state={value.state} />
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
