/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, memo, useContext, useMemo } from 'react';
import { FlyoutError } from '@kbn/security-solution-common';
import type { RuleOverviewPanelProps } from '.';

export interface RuleOverviewPanelContext {
  /**
   * Rule id if preview is rule details
   */
  ruleId: string;
}

export const RuleOverviewPanelContext = createContext<RuleOverviewPanelContext | undefined>(
  undefined
);

export type RuleOverviewPanelProviderProps = {
  /**
   * React components to render
   */
  children: React.ReactNode;
} & Partial<RuleOverviewPanelProps['params']>;

export const RuleOverviewPanelProvider = memo(
  ({ ruleId, children }: RuleOverviewPanelProviderProps) => {
    const contextValue = useMemo(() => (ruleId ? { ruleId } : undefined), [ruleId]);

    if (!contextValue) {
      return <FlyoutError />;
    }

    return (
      <RuleOverviewPanelContext.Provider value={contextValue}>
        {children}
      </RuleOverviewPanelContext.Provider>
    );
  }
);

RuleOverviewPanelProvider.displayName = 'RuleOverviewPanelProvider';

export const useRuleOverviewPanelContext = (): RuleOverviewPanelContext => {
  const contextValue = useContext(RuleOverviewPanelContext);

  if (!contextValue) {
    throw new Error(
      'RuleOverviewPanelContext can only be used within RuleOverviewPanelContext provider'
    );
  }

  return contextValue;
};
