/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';
import type { DiffableRule } from '../../../../../../common/api/detection_engine';
import { invariant } from '../../../../../../common/utils/invariant';
import type { SetRuleFieldResolvedValueFn } from '../../../model/prebuilt_rule_upgrade/set_rule_field_resolved_value';

interface FinalRuleContextType {
  finalDiffableRule: DiffableRule;
  setRuleFieldResolvedValue: SetRuleFieldResolvedValueFn;
}

const FinalRuleContext = createContext<FinalRuleContextType | null>(null);

interface FinalRuleContextProviderProps {
  finalDiffableRule: DiffableRule;
  setRuleFieldResolvedValue: SetRuleFieldResolvedValueFn;
  children: React.ReactNode;
}

export function FinalRuleContextProvider({
  finalDiffableRule,
  setRuleFieldResolvedValue,
  children,
}: FinalRuleContextProviderProps) {
  const contextValue = {
    finalDiffableRule,
    setRuleFieldResolvedValue,
  };

  return <FinalRuleContext.Provider value={contextValue}>{children}</FinalRuleContext.Provider>;
}

export function useFinalRuleContext() {
  const context = useContext(FinalRuleContext);

  invariant(context !== null, 'useFinalRuleContext must be used inside a FinalRuleContextProvider');

  return context;
}
