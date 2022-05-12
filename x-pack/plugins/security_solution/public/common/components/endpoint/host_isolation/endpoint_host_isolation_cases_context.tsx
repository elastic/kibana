/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { MutableRefObject, useContext } from 'react';
import { CaseViewRefreshPropInterface } from '@kbn/cases-plugin/common';

/**
 * React Context that can hold the `Ref` that is created an passed to `CaseViewProps['refreshRef`]`, enabling
 * child components to trigger a refresh of a case.
 */
export const CaseDetailsRefreshContext =
  React.createContext<MutableRefObject<CaseViewRefreshPropInterface> | null>(null);

/**
 * Returns the closes CaseDetails Refresh interface if any. Used in conjuction with `CaseDetailsRefreshContext` component
 *
 * @example
 * // Higher-order component
 * const refreshRef = useRef<CaseViewRefreshPropInterface>(null);
 * return <CaseDetailsRefreshContext.Provider value={refreshRef}>....</CaseDetailsRefreshContext.Provider>
 *
 * // Now, use the hook from a hild component that was rendered inside of `<CaseDetailsRefreshContext.Provider>`
 * const caseDetailsRefresh = useWithCaseDetailsRefresh();
 * ...
 * if (caseDetailsRefresh) {
 *   caseDetailsRefresh.refreshCase();
 * }
 */
export const useWithCaseDetailsRefresh = (): Readonly<CaseViewRefreshPropInterface> | undefined => {
  return useContext(CaseDetailsRefreshContext)?.current;
};
