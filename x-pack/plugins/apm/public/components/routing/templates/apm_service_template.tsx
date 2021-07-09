/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageHeaderProps,
  EuiTitle,
  EuiBetaBadge,
  EuiToolTip,
  EuiButtonEmpty,
} from '@elastic/eui';
import { ApmMainTemplate } from './apm_main_template';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { ApmServiceContextProvider } from '../../../context/apm_service/apm_service_context';
import { enableServiceOverview } from '../../../../common/ui_settings_keys';
import {
  isJavaAgentName,
  isRumAgentName,
  isIosAgentName,
} from '../../../../common/agent_name';
import { ServiceIcons } from '../../shared/service_icons';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { useErrorOverviewHref } from '../../shared/Links/apm/ErrorOverviewLink';
import { useMetricOverviewHref } from '../../shared/Links/apm/MetricOverviewLink';
import { useServiceMapHref } from '../../shared/Links/apm/ServiceMapLink';
import { useServiceNodeOverviewHref } from '../../shared/Links/apm/ServiceNodeOverviewLink';
import { useServiceOverviewHref } from '../../shared/Links/apm/service_overview_link';
import { useServiceProfilingHref } from '../../shared/Links/apm/service_profiling_link';
import { useTransactionsOverviewHref } from '../../shared/Links/apm/transaction_overview_link';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { ENVIRONMENT_NOT_DEFINED } from '../../../../common/environment_filter_values';
import {
  SERVICE_NAME,
  SERVICE_ENVIRONMENT,
} from '../../../../common/elasticsearch_fieldnames';
import { Correlations } from '../../app/correlations';
import { SearchBar } from '../../shared/search_bar';
import {
  createExploratoryViewUrl,
  SeriesUrl,
} from '../../../../../observability/public';

type Tab = NonNullable<EuiPageHeaderProps['tabs']>[0] & {
  key:
    | 'errors'
    | 'metrics'
    | 'nodes'
    | 'overview'
    | 'service-map'
    | 'profiling'
    | 'transactions';
  hidden?: boolean;
};

interface Props {
  children: React.ReactNode;
  serviceName: string;
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
  children,
  serviceName,
  selectedTab,
  searchBarOptions,
}: Props) {
  const tabs = useTabs({ serviceName, selectedTab });

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
                    <h1>{serviceName}</h1>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <ServiceIcons serviceName={serviceName} />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <AnalyzeDataButton serviceName={serviceName} />
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

function AnalyzeDataButton({ serviceName }: { serviceName: string }) {
  const { agentName } = useApmServiceContext();
  const { services } = useKibana();
  const { urlParams } = useUrlParams();
  const { rangeTo, rangeFrom, environment } = urlParams;
  const basepath = services.http?.basePath.get();

  if (
    (isRumAgentName(agentName) || isIosAgentName(agentName)) &&
    rangeFrom &&
    rangeTo
  ) {
    const href = createExploratoryViewUrl(
      {
        reportType: 'kpi-over-time',
        allSeries: [
          {
            name: `${serviceName}-series`,
            dataType: isRumAgentName(agentName) ? 'ux' : 'mobile',
            time: { from: rangeFrom, to: rangeTo },
            reportDefinitions: {
              [SERVICE_NAME]: [serviceName],
              ...(!!environment && ENVIRONMENT_NOT_DEFINED.value !== environment
                ? { [SERVICE_ENVIRONMENT]: [environment] }
                : {}),
            },
            operationType: 'average',
          },
        ],
      },
      basepath
    );

    return (
      <EuiToolTip
        position="top"
        content={i18n.translate('xpack.apm.analyzeDataButton.tooltip', {
          defaultMessage:
            'EXPERIMENTAL - Analyze Data allows you to select and filter result data in any dimension, and look for the cause or impact of performance problems',
        })}
      >
        <EuiButtonEmpty href={href} iconType="visBarVerticalStacked">
          {i18n.translate('xpack.apm.analyzeDataButton.label', {
            defaultMessage: 'Analyze data',
          })}
        </EuiButtonEmpty>
      </EuiToolTip>
    );
  }

  return null;
}

function useTabs({
  serviceName,
  selectedTab,
}: {
  serviceName: string;
  selectedTab: Tab['key'];
}) {
  const { agentName, transactionType } = useApmServiceContext();
  const { core, config } = useApmPluginContext();
  const { urlParams } = useUrlParams();

  const tabs: Tab[] = [
    {
      key: 'overview',
      href: useServiceOverviewHref({ serviceName, transactionType }),
      label: i18n.translate('xpack.apm.serviceDetails.overviewTabLabel', {
        defaultMessage: 'Overview',
      }),
      hidden: !core.uiSettings.get(enableServiceOverview),
    },
    {
      key: 'transactions',
      href: useTransactionsOverviewHref({
        serviceName,
        latencyAggregationType: urlParams.latencyAggregationType,
        transactionType,
      }),
      label: i18n.translate('xpack.apm.serviceDetails.transactionsTabLabel', {
        defaultMessage: 'Transactions',
      }),
    },
    {
      key: 'errors',
      href: useErrorOverviewHref(serviceName),
      label: i18n.translate('xpack.apm.serviceDetails.errorsTabLabel', {
        defaultMessage: 'Errors',
      }),
    },
    {
      key: 'nodes',
      href: useServiceNodeOverviewHref(serviceName),
      label: i18n.translate('xpack.apm.serviceDetails.nodesTabLabel', {
        defaultMessage: 'JVMs',
      }),
      hidden: !isJavaAgentName(agentName),
    },
    {
      key: 'metrics',
      href: useMetricOverviewHref(serviceName),
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
      key: 'service-map',
      href: useServiceMapHref(serviceName),
      label: i18n.translate('xpack.apm.home.serviceMapTabLabel', {
        defaultMessage: 'Service Map',
      }),
    },
    {
      key: 'profiling',
      href: useServiceProfilingHref({ serviceName }),
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
