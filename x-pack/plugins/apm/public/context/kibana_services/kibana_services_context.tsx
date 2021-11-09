/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext } from 'react';
import type { CoreStart } from '../../../../../../src/core/public';
import { KibanaContextProvider } from '../../../../../../src/plugins/kibana_react/public';
import type { TriggersAndActionsUIPublicPluginStart } from '../../../../triggers_actions_ui/public';

/**
 * The context value for Kibana services.
 *
 * The default for `useKibana` is `Partial<CoreStart>`, but we also need
 * `triggersActionsUi` where we load APM code into the alert creation flyouts.
 */
export type KibanaServicesContextValue = CoreStart & {
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
};

export const KibanaServicesContext = createContext<KibanaServicesContextValue>(
  {} as KibanaServicesContextValue
);

export function KibanaServicesContextProvider({
  value,
  children,
}: {
  value: KibanaServicesContextValue;
  children: React.ReactNode;
}) {
  return (
    <KibanaContextProvider services={value}>{children}</KibanaContextProvider>
  );
}
