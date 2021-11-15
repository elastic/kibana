/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { ChromeBreadcrumb } from 'kibana/public';
import { DEFAULT_BASE_PATH } from '../../common/navigation';

export interface CasesContextValue {
  owner: string[];
  appId: string;
  userCanCrud: boolean;
  basePath: string;
  rootBreadcrumbs?: ChromeBreadcrumb[];
}
export interface CasesContextProps extends Omit<CasesContextValue, 'basePath'> {
  basePath?: string;
}

export const CasesContext = React.createContext<CasesContextValue | undefined>(undefined);

export const CasesProvider: React.FC<{ value: CasesContextProps }> = ({
  children,
  value: { owner, appId, userCanCrud, basePath = DEFAULT_BASE_PATH, rootBreadcrumbs },
}) => {
  const [value, setValue] = useState<CasesContextValue>({
    owner,
    appId,
    userCanCrud,
    basePath,
    rootBreadcrumbs,
  });

  /**
   * `userCanCrud` prop may change by the parent plugin.
   * We need to re-render in that case, the rest of props are never updated.
   */
  useEffect(() => {
    setValue((prev) => ({ ...prev, userCanCrud }));
  }, [userCanCrud]);

  return <CasesContext.Provider value={value}>{children}</CasesContext.Provider>;
};
