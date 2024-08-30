/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { Outlet } from '@kbn/typed-react-router-config';
import * as t from 'io-ts';
import React from 'react';
import { Redirect } from 'react-router-dom';
import { dynamic } from '@kbn/shared-ux-utility';
import { agentConfigurationPageStepRt } from '../../../../common/agent_configuration/constants';
import { environmentRt } from '../../../../common/environment_rt';
import { Breadcrumb } from '../../app/breadcrumb';

const SettingsTemplate = dynamic(() =>
  import('../templates/settings_template').then((mod) => ({
    default: mod.SettingsTemplate,
  }))
);

const CreateAgentConfigurationRouteView = dynamic(() =>
  import('./create_agent_configuration_route_view').then((mod) => ({
    default: mod.CreateAgentConfigurationRouteView,
  }))
);
const EditAgentConfigurationRouteView = dynamic(() =>
  import('./edit_agent_configuration_route_view').then((mod) => ({
    default: mod.EditAgentConfigurationRouteView,
  }))
);
const AgentConfigurations = dynamic(() =>
  import('../../app/settings/agent_configurations').then((mod) => ({
    default: mod.AgentConfigurations,
  }))
);
const AgentExplorer = dynamic(() =>
  import('../../app/settings/agent_explorer').then((mod) => ({ default: mod.AgentExplorer }))
);
const AgentKeys = dynamic(() =>
  import('../../app/settings/agent_keys').then((mod) => ({ default: mod.AgentKeys }))
);
const AnomalyDetection = dynamic(() =>
  import('../../app/settings/anomaly_detection').then((mod) => ({ default: mod.AnomalyDetection }))
);
const ApmIndices = dynamic(() =>
  import('../../app/settings/apm_indices').then((mod) => ({ default: mod.ApmIndices }))
);
const CustomLinkOverview = dynamic(() =>
  import('../../app/settings/custom_link').then((mod) => ({ default: mod.CustomLinkOverview }))
);
const GeneralSettings = dynamic(() =>
  import('../../app/settings/general_settings').then((mod) => ({ default: mod.GeneralSettings }))
);
const Schema = dynamic(() =>
  import('../../app/settings/schema').then((mod) => ({ default: mod.Schema }))
);

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

export const settingsRoute = {
  '/settings': {
    element: (
      <Breadcrumb
        href="/settings"
        title={i18n.translate('xpack.apm.views.listSettings.title', {
          defaultMessage: 'Settings',
        })}
        omitOnServerless
      >
        <Outlet />
      </Breadcrumb>
    ),
    children: {
      '/settings/general-settings': page({
        title: i18n.translate('xpack.apm.views.settings.generalSettings.title', {
          defaultMessage: 'General settings',
        }),
        element: <GeneralSettings />,
        tab: 'general-settings',
      }),
      '/settings/agent-configuration': page({
        tab: 'agent-configuration',
        title: i18n.translate('xpack.apm.views.settings.agentConfiguration.title', {
          defaultMessage: 'Agent Configuration',
        }),
        element: <AgentConfigurations />,
      }),
      '/settings/agent-configuration/create': {
        ...page({
          title: i18n.translate('xpack.apm.views.settings.createAgentConfiguration.title', {
            defaultMessage: 'Create Agent Configuration',
          }),
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
          title: i18n.translate('xpack.apm.views.settings.editAgentConfiguration.title', {
            defaultMessage: 'Edit Agent Configuration',
          }),
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
        title: i18n.translate('xpack.apm.views.settings.anomalyDetection.title', {
          defaultMessage: 'Anomaly detection',
        }),
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
      '/settings/agent-explorer': {
        ...page({
          title: i18n.translate('xpack.apm.views.settings.agentExplorer.title', {
            defaultMessage: 'Agent explorer',
          }),
          element: <AgentExplorer />,
          tab: 'agent-explorer',
        }),
        params: t.type({
          query: t.intersection([
            environmentRt,
            t.type({
              kuery: t.string,
              agentLanguage: t.string,
              serviceName: t.string,
            }),
          ]),
        }),
      },
      '/settings': {
        element: <Redirect to="/settings/general-settings" />,
      },
    },
  },
};
