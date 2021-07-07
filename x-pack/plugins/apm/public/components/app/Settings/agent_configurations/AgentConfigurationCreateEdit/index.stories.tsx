/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { storiesOf } from '@storybook/react';
import React from 'react';
import { CoreStart } from 'kibana/public';
import { EuiThemeProvider } from '../../../../../../../../../src/plugins/kibana_react/common';
import { AgentConfiguration } from '../../../../../../common/agent_configuration/configuration_types';
import { FETCH_STATUS } from '../../../../../hooks/use_fetcher';
import { createCallApmApi } from '../../../../../services/rest/createCallApmApi';
import { AgentConfigurationCreateEdit } from './index';
import {
  ApmPluginContext,
  ApmPluginContextValue,
} from '../../../../../context/apm_plugin/apm_plugin_context';

storiesOf(
  'app/Settings/AgentConfigurations/AgentConfigurationCreateEdit',
  module
)
  .addDecorator((storyFn) => {
    const coreMock = ({} as unknown) as CoreStart;

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
      <EuiThemeProvider>
        <ApmPluginContext.Provider
          value={(contextMock as unknown) as ApmPluginContextValue}
        >
          {storyFn()}
        </ApmPluginContext.Provider>
      </EuiThemeProvider>
    );
  })
  .add(
    'with config',
    () => {
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
    {
      info: {
        propTablesExclude: [
          AgentConfigurationCreateEdit,
          ApmPluginContext.Provider,
          EuiThemeProvider,
        ],
        source: false,
      },
    }
  );
