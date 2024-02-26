/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPageHeaderProps } from '@elastic/eui';
import { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { enableAgentExplorerView } from '@kbn/observability-plugin/public';
import React from 'react';
import { Environment } from '../../../../common/environment_rt';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { useDefaultEnvironment } from '../../../hooks/use_default_environment';
import { BetaBadge } from '../../shared/beta_badge';
import { ApmRouter } from '../apm_route_config';
import { ApmMainTemplate } from './apm_main_template';
import { useApmFeatureFlag } from '../../../hooks/use_apm_feature_flag';
import { ApmFeatureFlagName } from '../../../../common/apm_feature_flags';

type Tab = NonNullable<EuiPageHeaderProps['tabs']>[0] & {
  key:
    | 'agent-configuration'
    | 'agent-keys'
    | 'anomaly-detection'
    | 'apm-indices'
    | 'custom-links'
    | 'schema'
    | 'general-settings'
    | 'agent-explorer';
  hidden?: boolean;
};

interface Props {
  children: React.ReactNode;
  selectedTab: Tab['key'];
}

export function SettingsTemplate({ children, selectedTab }: Props) {
  const { core } = useApmPluginContext();
  const router = useApmRouter();
  const defaultEnvironment = useDefaultEnvironment();

  const agentConfigurationAvailable = useApmFeatureFlag(
    ApmFeatureFlagName.AgentConfigurationAvailable
  );
  const migrationToFleetAvailable = useApmFeatureFlag(
    ApmFeatureFlagName.MigrationToFleetAvailable
  );
  const indicesAvailable = useApmFeatureFlag(
    ApmFeatureFlagName.ConfigurableIndicesAvailable
  );

  const tabs = getTabs({
    core,
    selectedTab,
    router,
    defaultEnvironment,
    agentConfigurationAvailable,
    migrationToFleetAvailable,
    indicesAvailable,
  });

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
  core,
  selectedTab,
  router,
  defaultEnvironment,
  agentConfigurationAvailable,
  migrationToFleetAvailable,
  indicesAvailable,
}: {
  core: CoreStart;
  selectedTab: Tab['key'];
  router: ApmRouter;
  defaultEnvironment: Environment;
  agentConfigurationAvailable: boolean;
  migrationToFleetAvailable: boolean;
  indicesAvailable: boolean;
}) {
  const canReadMlJobs = !!core.application.capabilities.ml?.canGetJobs;

  const agentExplorerEnabled = core.uiSettings.get<boolean>(
    enableAgentExplorerView,
    true
  );

  const tabs: Tab[] = [
    {
      key: 'general-settings',
      label: i18n.translate('xpack.apm.settings.generalSettings', {
        defaultMessage: 'General settings',
      }),
      href: router.link('/settings/general-settings'),
    },
    ...(agentConfigurationAvailable
      ? [
          {
            key: 'agent-configuration' as const,
            label: i18n.translate('xpack.apm.settings.agentConfig', {
              defaultMessage: 'Agent Configuration',
            }),
            href: router.link('/settings/agent-configuration'),
          },
        ]
      : []),
    {
      key: 'agent-explorer',
      label: i18n.translate('xpack.apm.settings.agentExplorer', {
        defaultMessage: 'Agent Explorer',
      }),
      href: router.link('/settings/agent-explorer', {
        query: {
          environment: defaultEnvironment,
          kuery: '',
          agentLanguage: '',
          serviceName: '',
        },
      }),
      append: <BetaBadge icon="beta" />,
      hidden: !agentExplorerEnabled,
    },
    {
      key: 'agent-keys',
      label: i18n.translate('xpack.apm.settings.agentKeys', {
        defaultMessage: 'Agent Keys',
      }),
      href: router.link('/settings/agent-keys'),
    },
    {
      key: 'anomaly-detection',
      label: i18n.translate('xpack.apm.settings.anomalyDetection', {
        defaultMessage: 'Anomaly detection',
      }),
      href: router.link('/settings/anomaly-detection'),
      hidden: !canReadMlJobs,
    },
    {
      key: 'custom-links',
      label: i18n.translate('xpack.apm.settings.customizeApp', {
        defaultMessage: 'Custom Links',
      }),
      href: router.link('/settings/custom-links'),
    },
    ...(indicesAvailable
      ? [
          {
            key: 'apm-indices' as const,
            label: i18n.translate('xpack.apm.settings.indices', {
              defaultMessage: 'Indices',
            }),
            href: router.link('/settings/apm-indices'),
          },
        ]
      : []),

    ...(migrationToFleetAvailable
      ? [
          {
            key: 'schema' as const,
            label: i18n.translate('xpack.apm.settings.schema', {
              defaultMessage: 'Schema',
            }),
            href: router.link('/settings/schema'),
          },
        ]
      : []),
  ];

  return tabs
    .filter((t) => !t.hidden)
    .map(({ href, key, label, append }) => ({
      href,
      label,
      append,
      isSelected: key === selectedTab,
    }));
}
