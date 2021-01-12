/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import cytoscape from 'cytoscape';
import { HttpSetup } from 'kibana/public';
import React, { ComponentType } from 'react';
import { EuiThemeProvider } from '../../../../../../observability/public';
import { MockApmPluginContextWrapper } from '../../../../context/apm_plugin/mock_apm_plugin_context';
import { MockUrlParamsContextProvider } from '../../../../context/url_params_context/mock_url_params_context_provider';
import { createCallApmApi } from '../../../../services/rest/createCallApmApi';
import { CytoscapeContext } from '../Cytoscape';
import { Popover } from './';
import exampleGroupedConnectionsData from '../__stories__/example_grouped_connections.json';

export default {
  title: 'app/ServiceMap/Popover',
  component: Popover,
  decorators: [
    (Story: ComponentType) => {
      const httpMock = ({
        get: async () => ({
          avgCpuUsage: 0.32809666568309237,
          avgErrorRate: 0.556068173242986,
          avgMemoryUsage: 0.5504868173242986,
          transactionStats: {
            avgRequestsPerMinute: 164.47222031860858,
            avgTransactionDuration: 61634.38905590272,
          },
        }),
      } as unknown) as HttpSetup;

      createCallApmApi(httpMock);

      return (
        <EuiThemeProvider>
          <MockUrlParamsContextProvider>
            <MockApmPluginContextWrapper>
              <div style={{ height: 325 }}>
                <Story />
              </div>
            </MockApmPluginContextWrapper>
          </MockUrlParamsContextProvider>
        </EuiThemeProvider>
      );
    },
  ],
};

export function Example() {
  return <Popover />;
}
Example.decorators = [
  (Story: ComponentType) => {
    const node = {
      data: { id: 'example service', 'service.name': 'example service' },
    };

    const cy = cytoscape({ elements: [node] });

    setTimeout(() => {
      cy.$id('example service').select();
    }, 0);

    return (
      <CytoscapeContext.Provider value={cy}>
        <Story />
      </CytoscapeContext.Provider>
    );
  },
];

export function Externals() {
  return <Popover />;
}
Externals.decorators = [
  (Story: ComponentType) => {
    const node = {
      data: exampleGroupedConnectionsData,
    };
    const cy = cytoscape({ elements: [node] });

    setTimeout(() => {
      cy.$id(exampleGroupedConnectionsData.id).select();
    }, 0);

    return (
      <CytoscapeContext.Provider value={cy}>
        <Story />
      </CytoscapeContext.Provider>
    );
  },
];
