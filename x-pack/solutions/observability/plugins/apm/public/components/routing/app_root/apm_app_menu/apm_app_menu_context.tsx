/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';
import React, { createContext, useContext } from 'react';

const ApmAppMenuContext = createContext<AppMenuConfig | undefined>(undefined);

export function ApmAppMenuProvider({
  config,
  children,
}: {
  config: AppMenuConfig;
  children: React.ReactNode;
}) {
  return <ApmAppMenuContext.Provider value={config}>{children}</ApmAppMenuContext.Provider>;
}

/**
 * Global APM app menu registered via {@link RegisterAppMenu}.
 * Inline AppHeader pages should pass this as `header.menu` under Chrome Next
 * (AppHeader does not read `chrome.getAppMenu$()` on its own).
 */
export function useApmAppMenuConfig(): AppMenuConfig | undefined {
  return useContext(ApmAppMenuContext);
}
