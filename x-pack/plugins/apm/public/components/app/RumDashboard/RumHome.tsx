/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { RumOverview } from '../RumDashboard';
import { CsmSharedContextProvider } from './CsmSharedContext';
import { MainFilters } from './Panels/MainFilters';
import { DatePicker } from '../../shared/DatePicker';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { EnvironmentFilter } from '../../shared/EnvironmentFilter';
import { UserPercentile } from './UserPercentile';
import { useBreakPoints } from '../../../hooks/use_break_points';

export const UX_LABEL = i18n.translate('xpack.apm.ux.title', {
  defaultMessage: 'User Experience',
});

export function RumHome() {
  const { observability } = useApmPluginContext();
  const PageTemplateComponent = observability.navigation.PageTemplate;

  const { isSmall } = useBreakPoints();

  const envStyle = isSmall ? {} : { maxWidth: 200 };

  return (
    <CsmSharedContextProvider>
      <PageTemplateComponent
        pageHeader={{
          pageTitle: UX_LABEL,
          rightSideItems: [
            <DatePicker />,
            <div style={envStyle}>
              <EnvironmentFilter />
            </div>,
            <UserPercentile />,
            <MainFilters />,
          ],
        }}
      >
        <RumOverview />
      </PageTemplateComponent>
    </CsmSharedContextProvider>
  );
}

export function UxHomeHeaderItems() {
  return (
    <EuiFlexGroup wrap justifyContent={'flexEnd'} responsive={true}>
      <MainFilters />
      <EuiFlexItem grow={false}>
        <DatePicker />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
