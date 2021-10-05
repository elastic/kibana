/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiTitle, EuiFlexItem } from '@elastic/eui';
import { RumOverview } from '../RumDashboard';
import { CsmSharedContextProvider } from './CsmSharedContext';
import { WebApplicationSelect } from './Panels/WebApplicationSelect';
import { DatePicker } from '../../shared/DatePicker';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { EnvironmentFilter } from '../../shared/EnvironmentFilter';
import { UserPercentile } from './UserPercentile';
import { useBreakpoints } from '../../../hooks/use_breakpoints';

export const DASHBOARD_LABEL = i18n.translate('xpack.apm.ux.title', {
  defaultMessage: 'Dashboard',
});

export function RumHome() {
  const { observability } = useApmPluginContext();
  const PageTemplateComponent = observability.navigation.PageTemplate;

  return (
    <CsmSharedContextProvider>
      <PageTemplateComponent pageHeader={{ children: <PageHeader /> }}>
        <RumOverview />
      </PageTemplateComponent>
    </CsmSharedContextProvider>
  );
}

function PageHeader() {
  const sizes = useBreakpoints();

  const datePickerStyle = sizes.isMedium ? {} : { maxWidth: '70%' };

  return (
    <div style={{ width: '100%' }}>
      <EuiFlexGroup wrap>
        <EuiFlexItem>
          <EuiTitle>
            <h1 className="eui-textNoWrap">{DASHBOARD_LABEL}</h1>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem style={{ alignItems: 'flex-end', ...datePickerStyle }}>
          <DatePicker />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup wrap>
        <EuiFlexItem>
          <WebApplicationSelect />
        </EuiFlexItem>
        <EuiFlexItem>
          <UserPercentile />
        </EuiFlexItem>
        <EuiFlexItem>
          <EnvironmentFilter />
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
}
