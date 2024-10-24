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

interface DiffableRuleContextType {
  finalDiffableRule: DiffableRule;
  setRuleFieldResolvedValue: SetRuleFieldResolvedValueFn;
}

const DiffableRuleContext = createContext<DiffableRuleContextType | null>(null);

interface DiffableRuleContextProviderProps {
  finalDiffableRule: DiffableRule;
  setRuleFieldResolvedValue: SetRuleFieldResolvedValueFn;
  children: React.ReactNode;
}

export function DiffableRuleContextProvider({
  finalDiffableRule,
  setRuleFieldResolvedValue,
  children,
}: DiffableRuleContextProviderProps) {
  const contextValue = {
    finalDiffableRule,
    setRuleFieldResolvedValue,
  };

  return (
    <DiffableRuleContext.Provider value={contextValue}>{children}</DiffableRuleContext.Provider>
  );
}

export function useDiffableRuleContext() {
  const context = useContext(DiffableRuleContext);

  invariant(
    context !== null,
    'useDiffableRuleContext must be used inside a DiffableRuleContextProvider'
  );

  return context;
}
