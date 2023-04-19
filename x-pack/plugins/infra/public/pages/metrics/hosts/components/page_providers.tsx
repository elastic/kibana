/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { HostsTableProvider } from '../hooks/use_hosts_table';
import { HostsViewProvider, useHostsViewContext } from '../hooks/use_hosts_view';
import { useUnifiedSearchContext } from '../hooks/use_unified_search';

export const HostsTableStateProvider = ({ children }: { children: React.ReactNode }) => {
  const { hostNodes } = useHostsViewContext();
  const { searchCriteria } = useUnifiedSearchContext();

  return (
    <HostsTableProvider nodes={hostNodes} tableParams={{ time: searchCriteria.dateRange }}>
      {children}
    </HostsTableProvider>
  );
};
export const PageProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <HostsViewProvider>
      <HostsTableStateProvider>{children}</HostsTableStateProvider>
    </HostsViewProvider>
  );
};
