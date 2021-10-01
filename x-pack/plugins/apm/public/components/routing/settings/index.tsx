/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import * as t from 'io-ts';
import { Outlet } from '@kbn/typed-react-router-config';
import { i18n } from '@kbn/i18n';
import { Redirect } from 'react-router-dom';
import { agentConfigurationPageStepRt } from '../../../../common/agent_configuration/constants';
import { Breadcrumb } from '../../app/breadcrumb';
import { SettingsTemplate } from '../templates/settings_template';
import { AgentConfigurations } from '../../app/Settings/agent_configurations';
import { CreateAgentConfigurationRouteView } from './create_agent_configuration_route_view';
import { EditAgentConfigurationRouteView } from './edit_agent_configuration_route_view';
import { ApmIndices } from '../../app/Settings/ApmIndices';
import { CustomizeUI } from '../../app/Settings/customize_ui';
import { Schema } from '../../app/Settings/schema';
import { AnomalyDetection } from '../../app/Settings/anomaly_detection';

function page<TPath extends string>({
  path,
  title,
  tab,
  element,
}: {
  path: TPath;
  title: string;
  tab: React.ComponentProps<typeof SettingsTemplate>['selectedTab'];
  element: React.ReactElement;
}): {
  element: React.ReactElement;
  path: TPath;
} {
  return {
    path,
    element: (
      <Breadcrumb title={title} href={`/settings${path}`}>
        <SettingsTemplate selectedTab={tab}>{element}</SettingsTemplate>
      </Breadcrumb>
    ),
  } as any;
}

export const settings = {
  path: '/settings',
  element: (
    <Breadcrumb
      href="/settings"
      title={i18n.translate('xpack.apm.views.listSettings.title', {
        defaultMessage: 'Settings',
      })}
    >
      <Outlet />
    </Breadcrumb>
  ),
  children: [
    page({
      path: '/settings/agent-configuration',
      tab: 'agent-configurations',
      title: i18n.translate(
        'xpack.apm.views.settings.agentConfiguration.title',
        { defaultMessage: 'Agent Configuration' }
      ),
      element: <AgentConfigurations />,
    }),
    {
      ...page({
        path: '/settings/agent-configuration/create',
        title: i18n.translate(
          'xpack.apm.views.settings.createAgentConfiguration.title',
          { defaultMessage: 'Create Agent Configuration' }
        ),
        tab: 'agent-configurations',
        element: <CreateAgentConfigurationRouteView />,
      }),
      params: t.partial({
        query: t.partial({
          pageStep: agentConfigurationPageStepRt,
        }),
      }),
    },
    {
      ...page({
        path: '/settings/agent-configuration/edit',
        title: i18n.translate(
          'xpack.apm.views.settings.editAgentConfiguration.title',
          { defaultMessage: 'Edit Agent Configuration' }
        ),
        tab: 'agent-configurations',
        element: <EditAgentConfigurationRouteView />,
      }),
      params: t.partial({
        query: t.partial({
          name: t.string,
          environment: t.string,
          pageStep: agentConfigurationPageStepRt,
        }),
      }),
    },
    page({
      path: '/settings/apm-indices',
      title: i18n.translate('xpack.apm.views.settings.indices.title', {
        defaultMessage: 'Indices',
      }),
      tab: 'apm-indices',
      element: <ApmIndices />,
    }),
    page({
      path: '/settings/customize-ui',
      title: i18n.translate('xpack.apm.views.settings.customizeUI.title', {
        defaultMessage: 'Customize app',
      }),
      tab: 'customize-ui',
      element: <CustomizeUI />,
    }),
    page({
      path: '/settings/schema',
      title: i18n.translate('xpack.apm.views.settings.schema.title', {
        defaultMessage: 'Schema',
      }),
      element: <Schema />,
      tab: 'schema',
    }),
    page({
      path: '/settings/anomaly-detection',
      title: i18n.translate('xpack.apm.views.settings.anomalyDetection.title', {
        defaultMessage: 'Anomaly detection',
      }),
      element: <AnomalyDetection />,
      tab: 'anomaly-detection',
    }),
    {
      path: '/settings',
      element: <Redirect to="/settings/agent-configuration" />,
    },
  ],
} as const;
