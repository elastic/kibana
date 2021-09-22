/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiTitle, EuiFlexItem } from '@elastic/eui';
import { RumOverview } from '../RumDashboard';
import { CsmSharedContextProvider } from './CsmSharedContext';
import { WebApplicationSelect } from './Panels/WebApplicationSelect';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { UxEnvironmentFilter } from '../../shared/EnvironmentFilter';
import { UserPercentile } from './UserPercentile';
import { useBreakpoints } from '../../../hooks/use_breakpoints';
import { KibanaPageTemplateProps } from '../../../../../../../src/plugins/kibana_react/public';
import { useHasRumData } from './hooks/useHasRumData';
import { RumDatePicker } from './rum_datepicker';
import { EmptyStateLoading } from './empty_state_loading';

export const UX_LABEL = i18n.translate('xpack.apm.ux.title', {
  defaultMessage: 'Dashboard',
});

export function RumHome() {
  const { core, observability } = useApmPluginContext();
  const PageTemplateComponent = observability.navigation.PageTemplate;

  const { isSmall, isXXL } = useBreakpoints();

  const { data: rumHasData, status } = useHasRumData();

  const envStyle = isSmall ? {} : { maxWidth: 500 };

  const noDataConfig: KibanaPageTemplateProps['noDataConfig'] =
    !rumHasData?.hasData
      ? {
          solution: i18n.translate('xpack.apm.ux.overview.solutionName', {
            defaultMessage: 'Observability',
          }),
          actions: {
            beats: {
              title: i18n.translate('xpack.apm.ux.overview.beatsCard.title', {
                defaultMessage: 'Add RUM data',
              }),
              description: i18n.translate(
                'xpack.apm.ux.overview.beatsCard.description',
                {
                  defaultMessage:
                    'Use the RUM (JS) agent to collect user experience data.',
                }
              ),
              href: core.http.basePath.prepend(`/app/home#/tutorial/apm`),
            },
          },
          docsLink: core.docLinks.links.observability.guide,
        }
      : undefined;

  const isLoading = status === 'loading';

  return (
    <Fragment>
      <CsmSharedContextProvider>
        <PageTemplateComponent
          noDataConfig={isLoading ? undefined : noDataConfig}
          pageHeader={
            isXXL
              ? {
                  pageTitle: i18n.translate('xpack.apm.ux.overview', {
                    defaultMessage: 'Dashboard',
                  }),
                  rightSideItems: [
                    <RumDatePicker />,
                    <div style={envStyle}>
                      <UxEnvironmentFilter />
                    </div>,
                    <UserPercentile />,
                    <WebApplicationSelect />,
                  ],
                }
              : { children: <PageHeader /> }
          }
        >
          {isLoading && <EmptyStateLoading />}
          <div style={{ visibility: isLoading ? 'hidden' : 'initial' }}>
            <RumOverview />
          </div>
        </PageTemplateComponent>
      </CsmSharedContextProvider>
    </Fragment>
  );
}

function PageHeader() {
  const { isSmall } = useBreakpoints();

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
          <RumDatePicker />
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
            <UxEnvironmentFilter />
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
}
