/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';
import type { DiffableRule } from '../../../../../../../common/api/detection_engine';
import type { SetFieldResolvedValueFn } from '../../../../../rule_management_ui/components/rules_table/upgrade_prebuilt_rules_table/use_prebuilt_rules_upgrade_state';
import { invariant } from '../../../../../../../common/utils/invariant';

interface FinalEditContextType {
  fieldName: string;
  finalDiffableRule: DiffableRule;
  setReadOnlyMode: () => void;
  setFieldResolvedValue: SetFieldResolvedValueFn;
}

const FinalEditContext = createContext<FinalEditContextType | null>(null);

interface FinalEditContextProviderProps {
  children: React.ReactNode;
  value: FinalEditContextType;
}

export function FinalEditContextProvider({ children, value }: FinalEditContextProviderProps) {
  return <FinalEditContext.Provider value={value}>{children}</FinalEditContext.Provider>;
}

export function useFinalEditContext() {
  const context = useContext(FinalEditContext);

  invariant(context !== null, 'useFinalEditContext must be used inside a FinalEditContextProvider');

  return context;
}
