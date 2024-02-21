/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGrid, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import React, { useContext } from 'react';
import { ThemeContext } from 'styled-components';
import { i18n } from '@kbn/i18n';
import { HttpSetup } from '@kbn/core/public';
import { FETCH_STATUS } from '@kbn/observability-shared-plugin/public';

import { useKibana } from '../../../../../utils/kibana_react';
import { paths } from '../../../../../../common/locators/paths';
import { useHasData } from '../../../../../hooks/use_has_data';
import { EmptySection, Section } from './empty_section';

export function EmptySections() {
  const { http } = useKibana().services;
  const theme = useContext(ThemeContext);
  const { hasDataMap } = useHasData();

  const appEmptySections = getEmptySections({ http }).filter(({ id }) => {
    const app = hasDataMap[id];
    if (app) {
      return app.status === FETCH_STATUS.FAILURE || !app.hasData;
    }
    return false;
  });
  return (
    <EuiFlexItem>
      <EuiSpacer size="s" />
      <EuiFlexGrid
        columns={
          // when more than 2 empty sections are available show them on 2 columns, otherwise 1
          appEmptySections.length > 2 ? 2 : 1
        }
        gutterSize="s"
      >
        {appEmptySections.map((app) => {
          return (
            <EuiFlexItem
              key={app.id}
              style={{
                border: `${theme.eui.euiBorderEditable}`,
                borderRadius: `${theme.eui.euiBorderRadius}`,
              }}
            >
              <EmptySection section={app} />
            </EuiFlexItem>
          );
        })}
      </EuiFlexGrid>
    </EuiFlexItem>
  );
}

const getEmptySections = ({ http }: { http: HttpSetup }): Section[] => {
  return [
    {
      id: 'infra_logs',
      title: i18n.translate('xpack.observability.emptySection.apps.logs.title', {
        defaultMessage: 'Logs',
      }),
      icon: 'logoLogging',
      description: i18n.translate('xpack.observability.emptySection.apps.logs.description', {
        defaultMessage:
          'Fast, easy, and scalable centralized log monitoring with out-of-the-box support for common data sources.',
      }),
      linkTitle: i18n.translate('xpack.observability.emptySection.apps.logs.link', {
        defaultMessage: 'Install Filebeat',
      }),
      href: http.basePath.prepend('/app/home#/tutorial_directory/logging'),
    },
    {
      id: 'apm',
      title: i18n.translate('xpack.observability.emptySection.apps.apm.title', {
        defaultMessage: 'APM',
      }),
      icon: 'logoObservability',
      description: i18n.translate('xpack.observability.emptySection.apps.apm.description', {
        defaultMessage:
          'Get deeper visibility into your applications with extensive support for popular languages, OpenTelemetry, and distributed tracing.',
      }),
      linkTitle: i18n.translate('xpack.observability.emptySection.apps.apm.link', {
        defaultMessage: 'Install Agent',
      }),
      href: http.basePath.prepend('/app/apm/tutorial'),
    },
    {
      id: 'infra_metrics',
      title: i18n.translate('xpack.observability.emptySection.apps.metrics.title', {
        defaultMessage: 'Metrics',
      }),
      icon: 'logoMetrics',
      description: i18n.translate('xpack.observability.emptySection.apps.metrics.description', {
        defaultMessage: 'Stream, visualize, and analyze your infrastructure metrics.',
      }),
      linkTitle: i18n.translate('xpack.observability.emptySection.apps.metrics.link', {
        defaultMessage: 'Install Metricbeat',
      }),
      href: http.basePath.prepend('/app/home#/tutorial_directory/metrics'),
    },
    {
      id: 'uptime',
      title: i18n.translate('xpack.observability.emptySection.apps.uptime.title', {
        defaultMessage: 'Uptime',
      }),
      icon: 'logoUptime',
      description: i18n.translate('xpack.observability.emptySection.apps.uptime.description', {
        defaultMessage: 'Proactively monitor the availability and functionality of user journeys.',
      }),
      linkTitle: i18n.translate('xpack.observability.emptySection.apps.uptime.link', {
        defaultMessage: 'Install Heartbeat',
      }),
      href: http.basePath.prepend('/app/home#/tutorial/uptimeMonitors'),
    },
    {
      id: 'ux',
      title: i18n.translate('xpack.observability.emptySection.apps.ux.title', {
        defaultMessage: 'User Experience',
      }),
      icon: 'logoObservability',
      description: i18n.translate('xpack.observability.emptySection.apps.ux.description', {
        defaultMessage:
          'Collect, measure, and analyze performance data that reflects real-world user experiences.',
      }),
      linkTitle: i18n.translate('xpack.observability.emptySection.apps.ux.link', {
        defaultMessage: 'Install RUM Agent',
      }),
      href: http.basePath.prepend('/app/apm/tutorial'),
    },
    {
      id: 'alert',
      title: i18n.translate('xpack.observability.emptySection.apps.alert.title', {
        defaultMessage: 'No alerts found.',
      }),
      icon: 'watchesApp',
      description: i18n.translate('xpack.observability.emptySection.apps.alert.description', {
        defaultMessage:
          'Detect complex conditions within Observability and trigger actions when those conditions are met.',
      }),
      linkTitle: i18n.translate('xpack.observability.emptySection.apps.alert.link', {
        defaultMessage: 'Create rule',
      }),
      href: http.basePath.prepend(paths.observability.rules),
    },
    {
      id: 'universal_profiling',
      title: i18n.translate('xpack.observability.emptySection.apps.universalProfiling.title', {
        defaultMessage: 'Universal Profiling',
      }),
      icon: 'logoObservability',
      description: i18n.translate(
        'xpack.observability.emptySection.apps.universalProfiling.description',
        {
          defaultMessage:
            'Understand what lines of code are consuming compute resources across your entire infrastructure, with minimal overhead and zero instrumentation',
        }
      ),
      linkTitle: i18n.translate('xpack.observability.emptySection.apps.universalProfiling.link', {
        defaultMessage: 'Install Profiling Host Agent',
      }),
      href: http.basePath.prepend('/app/profiling/add-data-instructions'),
    },
  ];
};
