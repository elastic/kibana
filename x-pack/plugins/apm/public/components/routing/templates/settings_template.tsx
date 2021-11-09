/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPageHeaderProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { History } from 'history';
import { useHistory } from 'react-router-dom';
import type { CoreStart } from 'kibana/public';
import { ApmMainTemplate } from './apm_main_template';
import { getLegacyApmHref } from '../../shared/Links/apm/APMLink';
import { useKibanaServicesContext } from '../../../context/kibana_services/use_kibana_services_context';

type Tab = NonNullable<EuiPageHeaderProps['tabs']>[0] & {
  key:
    | 'agent-configurations'
    | 'anomaly-detection'
    | 'apm-indices'
    | 'customize-ui'
    | 'schema';
  hidden?: boolean;
};

interface Props {
  children: React.ReactNode;
  selectedTab: Tab['key'];
}

export function SettingsTemplate({ children, selectedTab }: Props) {
  const services = useKibanaServicesContext();
  const history = useHistory();
  const tabs = getTabs({ history, services, selectedTab });

  return (
    <ApmMainTemplate
      pageHeader={{
        tabs,
        pageTitle: i18n.translate('xpack.apm.settings.title', {
          defaultMessage: 'Settings',
        }),
        rightSideItems: [], // hide EnvironmentFilter
      }}
    >
      {children}
    </ApmMainTemplate>
  );
}

function getTabs({
  history,
  services,
  selectedTab,
}: {
  history: History;
  services: CoreStart;
  selectedTab: Tab['key'];
}) {
  const { basePath } = services.http;
  const canAccessML = !!services.application.capabilities.ml?.canAccessML;
  const { search } = history.location;

  const tabs: Tab[] = [
    {
      key: 'agent-configurations',
      label: i18n.translate('xpack.apm.settings.agentConfig', {
        defaultMessage: 'Agent Configuration',
      }),
      href: getLegacyApmHref({
        basePath,
        path: `/settings/agent-configuration`,
        search,
      }),
    },
    {
      key: 'anomaly-detection',
      label: i18n.translate('xpack.apm.settings.anomalyDetection', {
        defaultMessage: 'Anomaly detection',
      }),
      href: getLegacyApmHref({
        basePath,
        path: `/settings/anomaly-detection`,
        search,
      }),
      hidden: !canAccessML,
    },
    {
      key: 'customize-ui',
      label: i18n.translate('xpack.apm.settings.customizeApp', {
        defaultMessage: 'Customize app',
      }),
      href: getLegacyApmHref({
        basePath,
        path: `/settings/customize-ui`,
        search,
      }),
    },
    {
      key: 'apm-indices',
      label: i18n.translate('xpack.apm.settings.indices', {
        defaultMessage: 'Indices',
      }),
      href: getLegacyApmHref({
        basePath,
        path: `/settings/apm-indices`,
        search,
      }),
    },
    {
      key: 'schema',
      label: i18n.translate('xpack.apm.settings.schema', {
        defaultMessage: 'Schema',
      }),
      href: getLegacyApmHref({ basePath, path: `/settings/schema`, search }),
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
