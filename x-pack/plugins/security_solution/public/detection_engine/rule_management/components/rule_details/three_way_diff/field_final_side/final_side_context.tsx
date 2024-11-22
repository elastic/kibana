/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, type PropsWithChildren, useCallback } from 'react';
import { invariant } from '../../../../../../../common/utils/invariant';
import { FinalSideMode } from './final_side_mode';
import type { UpgradeableDiffableFields } from '../../../../model/prebuilt_rule_upgrade/fields';

interface FinalSideContextType {
  fieldName: UpgradeableDiffableFields;
  mode: FinalSideMode;
  setReadOnlyMode: () => void;
  setEditMode: () => void;
}

const FinalSideContext = createContext<FinalSideContextType | null>(null);

interface FinalSideContextProviderProps {
  fieldName: UpgradeableDiffableFields;
  initialMode: FinalSideMode;
}

export function FinalSideContextProvider({
  children,
  fieldName,
  initialMode,
}: PropsWithChildren<FinalSideContextProviderProps>) {
  const [mode, setMode] = React.useState(initialMode);
  const setReadOnlyMode = useCallback(() => setMode(FinalSideMode.Readonly), []);
  const setEditMode = useCallback(() => setMode(FinalSideMode.Edit), []);

  const contextValue = {
    fieldName,
    setReadOnlyMode,
    setEditMode,
    mode,
  };

  return <FinalSideContext.Provider value={contextValue}>{children}</FinalSideContext.Provider>;
}

export function useFinalSideContext() {
  const context = useContext(FinalSideContext);

  invariant(context !== null, 'useFinalSideContext must be used inside a FinalSideContextProvider');

  return context;
}
