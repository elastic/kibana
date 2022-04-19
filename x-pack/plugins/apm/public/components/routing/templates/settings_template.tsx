/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPageHeaderProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { History } from 'history';
import { useHistory } from 'react-router-dom';
import { CoreStart } from '@kbn/core/public';
import { ApmMainTemplate } from './apm_main_template';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { getLegacyApmHref } from '../../shared/links/apm/apm_link';

type Tab = NonNullable<EuiPageHeaderProps['tabs']>[0] & {
  key:
    | 'agent-configuration'
    | 'agent-keys'
    | 'anomaly-detection'
    | 'apm-indices'
    | 'custom-links'
    | 'schema';
  hidden?: boolean;
};

interface Props {
  children: React.ReactNode;
  selectedTab: Tab['key'];
}

export function SettingsTemplate({ children, selectedTab }: Props) {
  const { core } = useApmPluginContext();
  const history = useHistory();
  const tabs = getTabs({ history, core, selectedTab });

  return (
    <ApmMainTemplate
      environmentFilter={false}
      pageHeader={{
        tabs,
        pageTitle: i18n.translate('xpack.apm.settings.title', {
          defaultMessage: 'Settings',
        }),
      }}
    >
      {children}
    </ApmMainTemplate>
  );
}

function getTabs({
  history,
  core,
  selectedTab,
}: {
  history: History;
  core: CoreStart;
  selectedTab: Tab['key'];
}) {
  const { basePath } = core.http;
  const canAccessML = !!core.application.capabilities.ml?.canAccessML;
  const { search } = history.location;

  const tabs: Tab[] = [
    {
      key: 'agent-configuration',
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
      key: 'agent-keys',
      label: i18n.translate('xpack.apm.settings.agentKeys', {
        defaultMessage: 'Agent Keys',
      }),
      href: getLegacyApmHref({
        basePath,
        path: `/settings/agent-keys`,
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
      key: 'custom-links',
      label: i18n.translate('xpack.apm.settings.customizeApp', {
        defaultMessage: 'Custom Links',
      }),
      href: getLegacyApmHref({
        basePath,
        path: `/settings/custom-links`,
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
