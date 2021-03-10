/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTitle } from '@elastic/eui';
import React, { ComponentType } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { HttpSetup } from '../../../../../../../src/core/public';
import { EuiThemeProvider } from '../../../../../../../src/plugins/kibana_react/common';
import { MockApmPluginContextWrapper } from '../../../context/apm_plugin/mock_apm_plugin_context';
import { MockUrlParamsContextProvider } from '../../../context/url_params_context/mock_url_params_context_provider';
import { createCallApmApi } from '../../../services/rest/createCallApmApi';
import { ApmHeader } from './';

export default {
  title: 'shared/ApmHeader',
  component: ApmHeader,
  decorators: [
    (Story: ComponentType) => {
      createCallApmApi(({} as unknown) as HttpSetup);

      return (
        <EuiThemeProvider>
          <MockUrlParamsContextProvider
            params={{ rangeFrom: 'now-15m', rangeTo: 'now' }}
          >
            <MockApmPluginContextWrapper>
              <MemoryRouter>
                <Story />
              </MemoryRouter>
            </MockApmPluginContextWrapper>
          </MockUrlParamsContextProvider>
        </EuiThemeProvider>
      );
    },
  ],
};

export function Example() {
  return (
    <ApmHeader>
      <EuiTitle>
        <h1>
          GET
          /api/v1/regions/azure-eastus2/clusters/elasticsearch/xc18de071deb4262be54baebf5f6a1ce/proxy/_snapshot/found-snapshots/_all
        </h1>
      </EuiTitle>
    </ApmHeader>
  );
}
