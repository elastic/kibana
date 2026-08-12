/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingLogo, EuiSpacer } from '@elastic/eui';
import type { AppHeaderBadge } from '@kbn/app-header';
import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';
import type { AgentName } from '@kbn/elastic-agent-utils';
import { i18n } from '@kbn/i18n';
import { OBSERVABILITY_SERVICE_ATTACHMENT_TYPE_ID } from '@kbn/observability-agent-builder-plugin/public';
import React, { useCallback, useEffect, useMemo } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { isMobileAgentName } from '../../../../../common/agent_name';
import { ApmIndexSettingsContextProvider } from '../../../../context/apm_index_settings/apm_index_settings_context';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { ApmServiceContextProvider } from '../../../../context/apm_service/apm_service_context';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { useBreadcrumb } from '../../../../context/breadcrumbs/use_breadcrumb';
import { ServiceAnomalyTimeseriesContextProvider } from '../../../../context/service_anomaly_timeseries/service_anomaly_timeseries_context';
import { ServiceSloContextProvider } from '../../../../context/service_slo/service_slo_context';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useApmRouter } from '../../../../hooks/use_apm_router';
import { isPending } from '../../../../hooks/use_fetcher';
import { useShouldShowAnomalyUi } from '../../../../hooks/use_should_show_anomaly_ui';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { replace } from '../../../shared/links/url_helpers';
import { SearchBar } from '../../../shared/search_bar/search_bar';
import { ServiceIcons } from '../../../shared/service_icons';
import { SloOverviewFlyout, useSloOverviewFlyout } from '../../../shared/slo_overview_flyout';
import { ApmMainTemplate } from '../apm_main_template';
import { useAnalyzeDataMenuItem } from './use_analyze_data_menu_item';
import { useServiceHeaderBadges } from './service_header_badges';
import type { TabKey } from './use_tabs';
import { useTabs } from './use_tabs';

interface Props {
  title: string;
  children: React.ReactChild;
  selectedTab: TabKey;
  searchBarOptions?: React.ComponentProps<typeof SearchBar>;
  customSearchBar?: React.ReactNode;
  bottomHeaderContent?: React.ComponentType;
  contentWrapper?: React.ComponentType<{ children: React.ReactNode }>;
}

export function ApmServiceTemplate(props: Props) {
  return (
    <ApmIndexSettingsContextProvider>
      <ApmServiceContextProvider>
        <ServiceSloProvider {...props} />
      </ApmServiceContextProvider>
    </ApmIndexSettingsContextProvider>
  );
}

/** Ensures SLO context is available before header badges read it. */
function ServiceSloProvider(props: Props) {
  const {
    path: { serviceName },
    query: { environment },
  } = useApmParams('/services/{serviceName}/*');

  return (
    <ServiceSloContextProvider serviceName={serviceName} environment={environment}>
      <TemplateWithContext {...props} />
    </ServiceSloContextProvider>
  );
}

function TemplateWithContext({
  title,
  children,
  selectedTab,
  searchBarOptions,
  customSearchBar,
  bottomHeaderContent: BottomHeaderContent,
  contentWrapper: ContentWrapper = React.Fragment,
}: Props) {
  const {
    path: { serviceName },
    query,
    query: { rangeFrom, rangeTo, environment },
  } = useApmParams('/services/{serviceName}/*');
  const history = useHistory();
  const location = useLocation();
  const { agentBuilder } = useApmPluginContext();

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const router = useApmRouter();

  const tabs = useTabs({ selectedTab });

  const { agentName, serviceAgentStatus } = useApmServiceContext();

  const isPendingServiceAgent = !agentName && isPending(serviceAgentStatus);

  const shouldShowAnomalyUi = useShouldShowAnomalyUi();

  const { sloOverviewFlyout, openSloOverviewFlyout, closeSloOverviewFlyout } =
    useSloOverviewFlyout();

  const onSloClick = useCallback(() => {
    openSloOverviewFlyout(serviceName, agentName as AgentName);
  }, [serviceName, agentName, openSloOverviewFlyout]);

  const alertsTabHref = router.link('/services/{serviceName}/alerts' as const, {
    path: { serviceName },
    query,
  });

  const serviceInventoryHref = router.link('/services', { query });

  const statusBadges = useServiceHeaderBadges({
    start,
    end,
    onSloClick,
    alertsTabHref,
  });

  const analyzeDataMenuItem = useAnalyzeDataMenuItem();

  const pageMenu = useMemo<AppMenuConfig | undefined>(() => {
    if (!analyzeDataMenuItem) {
      return undefined;
    }
    return { items: [analyzeDataMenuItem] };
  }, [analyzeDataMenuItem]);

  // AppHeader collapses to 2 visible badges + "+N" when there are more than 3 entries.
  // Bundle icons and status badges into at most 2 entries so alerts/SLO/anomaly stay visible.
  const headerBadges = useMemo<AppHeaderBadge[]>(() => {
    const badges: AppHeaderBadge[] = [
      {
        label: i18n.translate('xpack.apm.serviceDetails.serviceIconsBadgeLabel', {
          defaultMessage: 'Service icons',
        }),
        renderCustomBadge: () => (
          <ServiceIcons
            serviceName={serviceName}
            environment={environment}
            start={start}
            end={end}
          />
        ),
      },
    ];

    if (statusBadges.length > 0) {
      badges.push({
        label: i18n.translate('xpack.apm.serviceDetails.serviceStatusBadgesLabel', {
          defaultMessage: 'Service status',
        }),
        renderCustomBadge: () => (
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
            {statusBadges.map((badge) => (
              <EuiFlexItem key={badge.label} grow={false}>
                {badge.renderCustomBadge?.({ badgeText: badge.label })}
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        ),
      });
    }

    return badges;
  }, [end, environment, serviceName, start, statusBadges]);

  useBreadcrumb(
    () => ({
      title,
      href: router.link(`/services/{serviceName}/${selectedTab}` as const, {
        path: { serviceName },
        query,
      }),
    }),
    [query, router, selectedTab, serviceName, title]
  );

  // Configure agent builder global flyout with the service attachment
  useEffect(() => {
    if (!agentBuilder || !serviceName) {
      return;
    }

    agentBuilder.setChatConfig({
      attachments: [
        {
          type: OBSERVABILITY_SERVICE_ATTACHMENT_TYPE_ID,
          data: {
            serviceName,
            environment,
            start,
            end,
            attachmentLabel: i18n.translate('xpack.apm.serviceDetails.serviceAttachmentLabel', {
              defaultMessage: '{serviceName} service',
              values: { serviceName },
            }),
          },
        },
      ],
    });

    return () => {
      agentBuilder.clearChatConfig();
    };
  }, [agentBuilder, serviceName, environment, start, end]);

  if (isMobileAgentName(agentName)) {
    replace(history, {
      pathname: location.pathname.replace('/services/', '/mobile-services/'),
    });
  }

  return (
    <ContentWrapper>
      <ApmMainTemplate
        searchBar={
          <>
            {BottomHeaderContent && <BottomHeaderContent />}
            {customSearchBar ?? (
              <SearchBar
                {...searchBarOptions}
                showEnvironmentFilter
                showAnomalyThresholdSelector={shouldShowAnomalyUi}
              />
            )}
          </>
        }
        header={{
          title: serviceName,
          back: {
            href: serviceInventoryHref,
            label: i18n.translate('xpack.apm.serviceDetails.backToInventory', {
              defaultMessage: 'Service inventory',
            }),
          },
          badges: headerBadges,
          tabs,
          menu: pageMenu,
        }}
      >
        {isPendingServiceAgent ? (
          <EuiFlexGroup justifyContent="center">
            <EuiFlexItem grow={false}>
              <EuiSpacer size="l" />
              <EuiLoadingLogo
                logo="logoObservability"
                size="l"
                data-test-subj="apmMainTemplateServiceAgentLoader"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          <ServiceAnomalyTimeseriesContextProvider>
            {children}
          </ServiceAnomalyTimeseriesContextProvider>
        )}
        {sloOverviewFlyout && (
          <SloOverviewFlyout
            serviceName={sloOverviewFlyout.serviceName}
            agentName={sloOverviewFlyout.agentName as AgentName | undefined}
            onClose={closeSloOverviewFlyout}
          />
        )}
      </ApmMainTemplate>
    </ContentWrapper>
  );
}
