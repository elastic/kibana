/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiTitle, EuiFlexItem } from '@elastic/eui';
import { RumOverview } from '../RumDashboard';
import { CsmSharedContext, CsmSharedContextProvider } from './CsmSharedContext';
import { WebApplicationSelect } from './Panels/WebApplicationSelect';
import { DatePicker } from '../../shared/DatePicker';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { EnvironmentFilter } from '../../shared/EnvironmentFilter';
import { UserPercentile } from './UserPercentile';
import { useBreakPoints } from '../../../hooks/use_break_points';
import {
  NoDataPage,
  getKibanaNoDataPageTemplateProps,
} from '../../../../../../../src/plugins/kibana_react/public';

export const UX_LABEL = i18n.translate('xpack.apm.ux.title', {
  defaultMessage: 'User Experience',
});

export function RumHome() {
  const { observability } = useApmPluginContext();
  const PageTemplateComponent = observability.navigation.PageTemplate;

  const { isSmall, isXXL } = useBreakPoints();

  const envStyle = isSmall ? {} : { maxWidth: 500 };

  // TODO: NOT THE RIGHT METRIC TO CHECK
  const {
    sharedData: { totalPageViews },
  } = useContext(CsmSharedContext);

  return (
    <CsmSharedContextProvider>
      {totalPageViews > 0 ? (
        <PageTemplateComponent
          pageHeader={
            isXXL
              ? {
                  pageTitle: i18n.translate('xpack.apm.ux.overview', {
                    defaultMessage: 'Overview',
                  }),
                  rightSideItems: [
                    <DatePicker />,
                    <div style={envStyle}>
                      <EnvironmentFilter />
                    </div>,
                    <UserPercentile />,
                    <WebApplicationSelect />,
                  ],
                }
              : { children: <PageHeader /> }
          }
        >
          <RumOverview />
        </PageTemplateComponent>
      ) : (
        <PageTemplateComponent {...getKibanaNoDataPageTemplateProps()}>
          <NoDataPage
            solution="Observability"
            actions={{
              elasticAgent: {
                href: 'app/integrations/browse',
                recommended: false,
              },
              beats: {
                href: `app/home#/tutorial_directory/logging`,
                recommended: true,
              },
            }}
            docsLink={'#'}
          />
        </PageTemplateComponent>
      )}
    </CsmSharedContextProvider>
  );
}

function PageHeader() {
  const { isSmall } = useBreakPoints();

  const envStyle = isSmall ? {} : { maxWidth: 400 };

  return (
    <div style={{ width: '100%' }}>
      <EuiFlexGroup wrap>
        <EuiFlexItem>
          <EuiTitle>
            <h1>{UX_LABEL}</h1>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem>
          <DatePicker />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup wrap>
        <EuiFlexItem grow={false}>
          <WebApplicationSelect />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <UserPercentile />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <div style={envStyle}>
            <EnvironmentFilter />
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
}
