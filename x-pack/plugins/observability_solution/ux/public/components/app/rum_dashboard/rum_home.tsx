/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiTitle, EuiFlexItem } from '@elastic/eui';
import type { NoDataConfig } from '@kbn/shared-ux-page-kibana-template';
import { EuiSpacer } from '@elastic/eui';
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
  const { docLinks, http, observabilityShared, observabilityAIAssistant } =
    useKibanaServices();

  const PageTemplateComponent = observabilityShared.navigation.PageTemplate;

  const { hasData, loading: isLoading, dataViewTitle } = useHasRumData();

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
            href: http.basePath.prepend('/app/apm/tutorial'),
          },
        },
        docsLink: docLinks.links.observability.guide,
      }
    : undefined;

  let screenDescription = '';

  if (!hasData) {
    screenDescription = `The user is looking at a Getting Started screen that is displayed because no data could be retrieved.`;
  }
  if (dataViewTitle) {
    screenDescription = `${screenDescription} The index that was used to query the system is called ${dataViewTitle}.`;
  } else {
    screenDescription = `${screenDescription} The index that was used to query the system is undefined, so it is not configured yet.`;
  }

  useEffect(() => {
    return observabilityAIAssistant?.service.setScreenContext({
      screenDescription,
      starterPrompts: [
        ...(!hasData
          ? [
              {
                title: i18n.translate(
                  'xpack.ux.aiAssistant.starterPrompts.explainNoData.title',
                  { defaultMessage: 'Explain' }
                ),
                prompt: i18n.translate(
                  'xpack.ux.aiAssistant.starterPrompts.explainNoData.prompt',
                  { defaultMessage: "Why don't I see any data?" }
                ),
                icon: 'sparkles',
              },
            ]
          : []),
      ],
    });
  }, [hasData, observabilityAIAssistant?.service, screenDescription]);

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
      <EuiSpacer size="m" />
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
