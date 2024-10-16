/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, type PropsWithChildren, useCallback } from 'react';
import { invariant } from '../../../../../../../common/utils/invariant';
import { FinalSideMode } from './constants';
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
}

export function FinalSideContextProvider({
  children,
  fieldName,
}: PropsWithChildren<FinalSideContextProviderProps>) {
  const [mode, setMode] = React.useState<FinalSideMode>(FinalSideMode.READONLY);
  const setReadOnlyMode = useCallback(() => setMode(FinalSideMode.READONLY), []);
  const setEditMode = useCallback(() => setMode(FinalSideMode.EDIT), []);

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
