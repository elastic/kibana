import React from 'react';
import { CoreStart } from '@kbn/core/public';
import { AgentConfiguration } from '../../../../../../common/agent_configuration/configuration_types';
import { FETCH_STATUS } from '../../../../../hooks/use_fetcher';
import { createCallApmApi } from '../../../../../services/rest/create_call_apm_api';
import { AgentConfigurationCreateEdit } from '.';
import {
  ApmPluginContext,
  ApmPluginContextValue,
} from '../../../../../context/apm_plugin/apm_plugin_context';

export default {
  title: 'app/settings/AgentConfigurations/agent_configuration_create_edit',

  decorators: [
    (storyFn) => {
      const coreMock = {} as unknown as CoreStart;

      // mock
      createCallApmApi(coreMock);

      const contextMock = {
        core: {
          notifications: {
            toasts: { addWarning: () => {}, addDanger: () => {} },
          },
        },
      };

      return (
        <ApmPluginContext.Provider value={contextMock as unknown as ApmPluginContextValue}>
          {storyFn()}
        </ApmPluginContext.Provider>
      );
    },
  ],
};

export const WithConfig = {
  render: () => {
    return (
      <AgentConfigurationCreateEdit
        pageStep="choose-settings-step"
        existingConfigResult={{
          status: FETCH_STATUS.SUCCESS,
          data: {
            service: { name: 'opbeans-node', environment: 'production' },
            settings: {},
          } as AgentConfiguration,
        }}
      />
    );
  },

  name: 'with config',

  parameters: {
    info: {
      propTablesExclude: [AgentConfigurationCreateEdit, ApmPluginContext.Provider],
      source: false,
    },
  },
};
