/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBetaBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageHeaderProps,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { omit } from 'lodash';
import React from 'react';
import {
  isIosAgentName,
  isJavaAgentName,
  isRumAgentName,
} from '../../../../../common/agent_name';
import { enableServiceOverview } from '../../../../../common/ui_settings_keys';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { ApmServiceContextProvider } from '../../../../context/apm_service/apm_service_context';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { useBreadcrumb } from '../../../../context/breadcrumbs/use_breadcrumb';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useApmRouter } from '../../../../hooks/use_apm_router';
import { Correlations } from '../../../app/correlations';
import { SearchBar } from '../../../shared/search_bar';
import { ServiceIcons } from '../../../shared/service_icons';
import { ApmMainTemplate } from '../apm_main_template';
import { AnalyzeDataButton } from './analyze_data_button';

type Tab = NonNullable<EuiPageHeaderProps['tabs']>[0] & {
  key:
    | 'overview'
    | 'transactions'
    | 'errors'
    | 'metrics'
    | 'nodes'
    | 'service-map'
    | 'profiling';
  hidden?: boolean;
};

interface Props {
  title: string;
  children: React.ReactNode;
  selectedTab: Tab['key'];
  searchBarOptions?: React.ComponentProps<typeof SearchBar>;
}

export function ApmServiceTemplate(props: Props) {
  return (
    <ApmServiceContextProvider>
      <TemplateWithContext {...props} />
    </ApmServiceContextProvider>
  );
}

function TemplateWithContext({
  title,
  children,
  selectedTab,
  searchBarOptions,
}: Props) {
  const {
    path: { serviceName },
    query,
  } = useApmParams('/services/:serviceName/*');

  const router = useApmRouter();

  const tabs = useTabs({ selectedTab });

  useBreadcrumb({
    title,
    href: router.link(`/services/:serviceName/${selectedTab}` as const, {
      path: { serviceName },
      query,
    }),
  });

  return (
    <ApmMainTemplate
      pageHeader={{
        tabs,
        pageTitle: (
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem>
              <EuiFlexGroup alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiTitle size="l">
                    <h1 data-test-subj="apmMainTemplateHeaderServiceName">
                      {serviceName}
                    </h1>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <ServiceIcons serviceName={serviceName} />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <AnalyzeDataButton />
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <Correlations />
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      }}
    >
      <SearchBar {...searchBarOptions} />

      {children}
    </ApmMainTemplate>
  );
}

function useTabs({ selectedTab }: { selectedTab: Tab['key'] }) {
  const { agentName } = useApmServiceContext();
  const { core, config } = useApmPluginContext();

  const router = useApmRouter();

  const {
    path: { serviceName },
    query: queryFromUrl,
  } = useApmParams(`/services/:serviceName/${selectedTab}` as const);

  const query = omit(
    queryFromUrl,
    'page',
    'pageSize',
    'sortField',
    'sortDirection'
  );

  const tabs: Tab[] = [
    {
      key: 'overview',
      href: router.link('/services/:serviceName/overview', {
        path: { serviceName },
        query,
      }),
      label: i18n.translate('xpack.apm.serviceDetails.overviewTabLabel', {
        defaultMessage: 'Overview',
      }),
      hidden: !core.uiSettings.get(enableServiceOverview),
    },
    {
      key: 'transactions',
      href: router.link('/services/:serviceName/transactions', {
        path: { serviceName },
        query,
      }),
      label: i18n.translate('xpack.apm.serviceDetails.transactionsTabLabel', {
        defaultMessage: 'Transactions',
      }),
    },
    {
      key: 'errors',
      href: router.link('/services/:serviceName/errors', {
        path: { serviceName },
        query,
      }),
      label: i18n.translate('xpack.apm.serviceDetails.errorsTabLabel', {
        defaultMessage: 'Errors',
      }),
    },
    {
      key: 'metrics',
      href: router.link('/services/:serviceName/metrics', {
        path: { serviceName },
        query,
      }),
      label: i18n.translate('xpack.apm.serviceDetails.metricsTabLabel', {
        defaultMessage: 'Metrics',
      }),
      hidden:
        !agentName ||
        isRumAgentName(agentName) ||
        isJavaAgentName(agentName) ||
        isIosAgentName(agentName),
    },
    {
      key: 'nodes',
      href: router.link('/services/:serviceName/nodes', {
        path: { serviceName },
        query,
      }),
      label: i18n.translate('xpack.apm.serviceDetails.nodesTabLabel', {
        defaultMessage: 'JVMs',
      }),
      hidden: !isJavaAgentName(agentName),
    },
    {
      key: 'service-map',
      href: router.link('/services/:serviceName/service-map', {
        path: { serviceName },
        query,
      }),
      label: i18n.translate('xpack.apm.home.serviceMapTabLabel', {
        defaultMessage: 'Service Map',
      }),
    },
    {
      key: 'profiling',
      href: router.link('/services/:serviceName/profiling', {
        path: {
          serviceName,
        },
        query,
      }),
      hidden: !config.profilingEnabled,
      label: (
        <EuiFlexGroup direction="row" gutterSize="s">
          <EuiFlexItem>
            {i18n.translate('xpack.apm.serviceDetails.profilingTabLabel', {
              defaultMessage: 'Profiling',
            })}
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiBetaBadge
              label={i18n.translate(
                'xpack.apm.serviceDetails.profilingTabExperimentalLabel',
                {
                  defaultMessage: 'Experimental',
                }
              )}
              tooltipContent={i18n.translate(
                'xpack.apm.serviceDetails.profilingTabExperimentalDescription',
                {
                  defaultMessage:
                    'Profiling is highly experimental and for internal use only.',
                }
              )}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    },
  ];

  return tabs
    .filter((t) => !t.hidden)
    .map(({ href, key, label }) => ({
      href,
      label,
      isSelected: key === selectedTab,
    }));
}
