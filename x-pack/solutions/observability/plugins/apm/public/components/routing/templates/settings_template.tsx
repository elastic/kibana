/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppHeaderTab } from '@kbn/app-header';
import type { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { Environment } from '../../../../common/environment_rt';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { useDefaultEnvironment } from '../../../hooks/use_default_environment';
import type { ApmRouter } from '../apm_route_config';
import { ApmMainTemplate } from './apm_main_template';
import { useApmFeatureFlag } from '../../../hooks/use_apm_feature_flag';
import { ApmFeatureFlagName } from '../../../../common/apm_feature_flags';

type Tab = AppHeaderTab & {
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
  const migrationToFleetAvailable = useApmFeatureFlag(ApmFeatureFlagName.MigrationToFleetAvailable);
  const indicesAvailable = useApmFeatureFlag(ApmFeatureFlagName.ConfigurableIndicesAvailable);

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
      header={{
        title: i18n.translate('xpack.apm.settings.title', {
          defaultMessage: 'Settings',
        }),
        tabs,
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
}): AppHeaderTab[] {
  const canReadMlJobs = !!core.application.capabilities.ml?.canGetJobs;

  const tabs: Tab[] = [
    {
      key: 'general-settings',
      id: 'general-settings',
      label: i18n.translate('xpack.apm.settings.generalSettings', {
        defaultMessage: 'General settings',
      }),
      href: router.link('/settings/general-settings'),
      'data-test-subj': 'apmSettingsTab_general-settings',
    },
    ...(agentConfigurationAvailable
      ? [
          {
            key: 'agent-configuration' as const,
            id: 'agent-configuration',
            label: i18n.translate('xpack.apm.settings.agentConfig', {
              defaultMessage: 'Agent Configuration',
            }),
            href: router.link('/settings/agent-configuration'),
            'data-test-subj': 'apmSettingsTab_agent-configuration',
          },
        ]
      : []),
    {
      key: 'agent-explorer',
      id: 'agent-explorer',
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
      'data-test-subj': 'apmSettingsTab_agent-explorer',
    },
    {
      key: 'agent-keys',
      id: 'agent-keys',
      label: i18n.translate('xpack.apm.settings.agentKeys', {
        defaultMessage: 'Agent Keys',
      }),
      href: router.link('/settings/agent-keys'),
      'data-test-subj': 'apmSettingsTab_agent-keys',
    },
    {
      key: 'anomaly-detection',
      id: 'anomaly-detection',
      label: i18n.translate('xpack.apm.settings.anomalyDetection', {
        defaultMessage: 'Anomaly detection',
      }),
      href: router.link('/settings/anomaly-detection'),
      hidden: !canReadMlJobs,
      'data-test-subj': 'apmSettingsTab_anomaly-detection',
    },
    {
      key: 'custom-links',
      id: 'custom-links',
      label: i18n.translate('xpack.apm.settings.customizeApp', {
        defaultMessage: 'Custom Links',
      }),
      href: router.link('/settings/custom-links'),
      'data-test-subj': 'apmSettingsTab_custom-links',
    },
    ...(indicesAvailable
      ? [
          {
            key: 'apm-indices' as const,
            id: 'apm-indices',
            label: i18n.translate('xpack.apm.settings.indices', {
              defaultMessage: 'Indices',
            }),
            href: router.link('/settings/apm-indices'),
            'data-test-subj': 'apmSettingsTab_apm-indices',
          },
        ]
      : []),

    ...(migrationToFleetAvailable
      ? [
          {
            key: 'schema' as const,
            id: 'schema',
            label: i18n.translate('xpack.apm.settings.schema', {
              defaultMessage: 'Schema',
            }),
            href: router.link('/settings/schema'),
            'data-test-subj': 'apmSettingsTab_schema',
          },
        ]
      : []),
  ];

  return tabs
    .filter((t) => !t.hidden)
    .map(({ href, key, label, 'data-test-subj': testSubj }) => ({
      id: key,
      label,
      href,
      isSelected: key === selectedTab,
      'data-test-subj': testSubj,
    }));
}
