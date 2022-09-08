/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiTitle, EuiFlexItem } from '@elastic/eui';
import type { NoDataConfig } from '@kbn/shared-ux-page-kibana-template';
import { WebApplicationSelect } from './panels/web_application_select';
import { UserPercentile } from './user_percentile';
import { useBreakpoints } from '../../../hooks/use_breakpoints';
import { useHasRumData } from './hooks/use_has_rum_data';
import { RumDatePicker } from './rum_datepicker';
import { EmptyStateLoading } from './empty_state_loading';
import { useKibanaServices } from '../../../hooks/use_kibana_services';
import { UxEnvironmentFilter } from './environment_filter';
import { RumOverview } from '.';

export const DASHBOARD_LABEL = i18n.translate('xpack.ux.title', {
  defaultMessage: 'Dashboard',
});

export function RumHome() {
  const { docLinks, http, observability } = useKibanaServices();

  const PageTemplateComponent = observability.navigation.PageTemplate;

  const { hasData, loading: isLoading } = useHasRumData();

  const noDataConfig: NoDataConfig | undefined = !hasData
    ? {
        solution: i18n.translate('xpack.ux.overview.solutionName', {
          defaultMessage: 'Observability',
        }),
        action: {
          elasticAgent: {
            title: i18n.translate('xpack.ux.overview.beatsCard.title', {
              defaultMessage: 'Add RUM data',
            }),
            description: i18n.translate(
              'xpack.ux.overview.beatsCard.description',
              {
                defaultMessage:
                  'Enable RUM with the APM agent to collect user experience data.',
              }
            ),
            href: http.basePath.prepend(`/app/home#/tutorial/apm`),
          },
        },
        docsLink: docLinks.links.observability.guide,
      }
    : undefined;

  return (
    <PageTemplateComponent
      noDataConfig={isLoading ? undefined : noDataConfig}
      pageHeader={{ children: <PageHeader /> }}
      isPageDataLoaded={isLoading === false}
      isEmptyState={isLoading}
    >
      {isLoading && <EmptyStateLoading />}
      <div style={{ visibility: isLoading ? 'hidden' : 'initial' }}>
        <RumOverview />
      </div>
    </PageTemplateComponent>
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
          <RumDatePicker />
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
          <UxEnvironmentFilter />
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
}
