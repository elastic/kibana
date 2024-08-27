/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { ReactQueryClientProvider } from '../../../../../../../common/containers/query_client/query_client_provider';
// import { UpgradePrebuiltRulesTableContextProvider } from '../../../../../../rule_management_ui/components/rules_table/upgrade_prebuilt_rules_table/upgrade_prebuilt_rules_table_context';
import { createKibanaServicesMock } from './utils';

interface StorybookProvidersProps {
  children: React.ReactNode;
  kibanaServicesMock?: ReturnType<typeof createKibanaServicesMock>;
}

export function StorybookProviders({ children, kibanaServicesMock }: StorybookProvidersProps) {
  const KibanaReactContext = createKibanaReactContext(createKibanaServicesMock(kibanaServicesMock));

  return (
    <KibanaReactContext.Provider>
      <ReactQueryClientProvider>{children}</ReactQueryClientProvider>
    </KibanaReactContext.Provider>
  );
}
