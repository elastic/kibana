/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { DEFAULT_BASE_PATH } from '../../common/navigation';
import { useApplication } from '../../common/lib/kibana';

export interface CasesContextValue {
  owner: string[];
  appId: string;
  appTitle: string;
  userCanCrud: boolean;
  basePath: string;
}

export const CasesContext = React.createContext<CasesContextValue | undefined>(undefined);

export interface CasesContextProps
  extends Omit<CasesContextValue, 'appId' | 'appTitle' | 'basePath'> {
  basePath?: string;
}

export interface CasesContextStateValue
  extends Omit<CasesContextValue, 'appId' | 'appTitle' | 'userCanCrud'> {
  appId?: string;
  appTitle?: string;
  userCanCrud?: boolean;
}

export const CasesProvider: React.FC<{ value: CasesContextProps }> = ({
  children,
  value: { owner, userCanCrud, basePath = DEFAULT_BASE_PATH },
}) => {
  const { appId, appTitle } = useApplication();

  const [value, setValue] = useState<CasesContextStateValue>({
    owner,
    userCanCrud,
    basePath,
  });

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
    <CasesContext.Provider value={value}>{children}</CasesContext.Provider>
  ) : null;
};

function isCasesContextValue(value: CasesContextStateValue): value is CasesContextValue {
  return value.appId != null && value.appTitle != null && value.userCanCrud != null;
}
