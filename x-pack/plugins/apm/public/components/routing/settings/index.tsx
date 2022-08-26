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
import { AgentConfigurations } from '../../app/settings/agent_configurations';
import { CreateAgentConfigurationRouteView } from './create_agent_configuration_route_view';
import { EditAgentConfigurationRouteView } from './edit_agent_configuration_route_view';
import { ApmIndices } from '../../app/settings/apm_indices';
import { CustomLinkOverview } from '../../app/settings/custom_link';
import { Schema } from '../../app/settings/schema';
import { AnomalyDetection } from '../../app/settings/anomaly_detection';
import { AgentKeys } from '../../app/settings/agent_keys';

function page({
  title,
  tab,
  element,
}: {
  title: string;
  tab: React.ComponentProps<typeof SettingsTemplate>['selectedTab'];
  element: React.ReactElement;
}): {
  element: React.ReactElement;
} {
  return {
    element: (
      <Breadcrumb title={title} href={`/settings/${tab}`}>
        <SettingsTemplate selectedTab={tab}>{element}</SettingsTemplate>
      </Breadcrumb>
    ),
  };
}

export const settings = {
  '/settings': {
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
    children: {
      '/settings/agent-configuration': page({
        tab: 'agent-configuration',
        title: i18n.translate(
          'xpack.apm.views.settings.agentConfiguration.title',
          { defaultMessage: 'Agent Configuration' }
        ),
        element: <AgentConfigurations />,
      }),
      '/settings/agent-configuration/create': {
        ...page({
          title: i18n.translate(
            'xpack.apm.views.settings.createAgentConfiguration.title',
            { defaultMessage: 'Create Agent Configuration' }
          ),
          tab: 'agent-configuration',
          element: <CreateAgentConfigurationRouteView />,
        }),
        params: t.partial({
          query: t.partial({
            pageStep: agentConfigurationPageStepRt,
          }),
        }),
      },
      '/settings/agent-configuration/edit': {
        ...page({
          title: i18n.translate(
            'xpack.apm.views.settings.editAgentConfiguration.title',
            { defaultMessage: 'Edit Agent Configuration' }
          ),
          tab: 'agent-configuration',
          element: <EditAgentConfigurationRouteView />,
        }),
        params: t.partial({
          query: t.partial({
            environment: t.string,
            name: t.string,
            pageStep: agentConfigurationPageStepRt,
          }),
        }),
      },
      '/settings/apm-indices': page({
        title: i18n.translate('xpack.apm.views.settings.indices.title', {
          defaultMessage: 'Indices',
        }),
        tab: 'apm-indices',
        element: <ApmIndices />,
      }),
      '/settings/custom-links': page({
        title: i18n.translate('xpack.apm.views.settings.customLink.title', {
          defaultMessage: 'Custom Links',
        }),
        tab: 'custom-links',
        element: <CustomLinkOverview />,
      }),
      '/settings/schema': page({
        title: i18n.translate('xpack.apm.views.settings.schema.title', {
          defaultMessage: 'Schema',
        }),
        element: <Schema />,
        tab: 'schema',
      }),
      '/settings/anomaly-detection': page({
        title: i18n.translate(
          'xpack.apm.views.settings.anomalyDetection.title',
          {
            defaultMessage: 'Anomaly detection',
          }
        ),
        element: <AnomalyDetection />,
        tab: 'anomaly-detection',
      }),
      '/settings/agent-keys': page({
        title: i18n.translate('xpack.apm.views.settings.agentKeys.title', {
          defaultMessage: 'Agent keys',
        }),
        element: <AgentKeys />,
        tab: 'agent-keys',
      }),
      '/settings': {
        element: <Redirect to="/settings/agent-configuration" />,
      },
    },
  },
};
