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
import { omit } from 'lodash';
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
import { useApmParams } from '../../../hooks/use_apm_params';
import { useBreadcrumb } from '../../../context/breadcrumbs/use_breadcrumb';
import { useApmRouter } from '../../../hooks/use_apm_router';

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

  if (isRumAgentName(agentName) || isIosAgentName(agentName)) {
    const href = createExploratoryViewUrl(
      {
        'apm-series': {
          dataType: isRumAgentName(agentName) ? 'ux' : 'mobile',
          time: { from: rangeFrom, to: rangeTo },
          reportType: 'kpi-over-time',
          reportDefinitions: {
            [SERVICE_NAME]: [serviceName],
            ...(!!environment && ENVIRONMENT_NOT_DEFINED.value !== environment
              ? { [SERVICE_ENVIRONMENT]: [environment] }
              : {}),
          },
          operationType: 'average',
          isNew: true,
        } as SeriesUrl,
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
