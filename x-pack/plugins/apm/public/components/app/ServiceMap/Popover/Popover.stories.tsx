/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { storiesOf } from '@storybook/react';
import cytoscape from 'cytoscape';
import { HttpSetup } from 'kibana/public';
import React from 'react';
import { EuiThemeProvider } from '../../../../../../observability/public';
import { MockApmPluginContextWrapper } from '../../../../context/ApmPluginContext/MockApmPluginContext';
import { MockUrlParamsContextProvider } from '../../../../context/UrlParamsContext/MockUrlParamsContextProvider';
import { createCallApmApi } from '../../../../services/rest/createCallApmApi';
import { CytoscapeContext } from '../Cytoscape';
import { Popover } from './';
import { ServiceStatsList } from './ServiceStatsList';

storiesOf('app/ServiceMap/Popover', module)
  .addDecorator((storyFn) => {
    const node = {
      data: { id: 'example service', 'service.name': 'example service' },
    };
    const cy = cytoscape({ elements: [node] });
    const httpMock = ({
      get: async () => ({
        avgCpuUsage: 0.32809666568309237,
        avgErrorRate: 0.556068173242986,
        avgMemoryUsage: 0.5504868173242986,
        avgRequestsPerMinute: 164.47222031860858,
        avgTransactionDuration: 61634.38905590272,
      }),
    } as unknown) as HttpSetup;

    createCallApmApi(httpMock);

    setImmediate(() => {
      cy.$('example service').select();
    });

    return (
      <EuiThemeProvider>
        <MockUrlParamsContextProvider>
          <MockApmPluginContextWrapper>
            <CytoscapeContext.Provider value={cy}>
              <div style={{ height: 325 }}>{storyFn()}</div>
            </CytoscapeContext.Provider>
          </MockApmPluginContextWrapper>
        </MockUrlParamsContextProvider>
      </EuiThemeProvider>
    );
  })
  .add(
    'example',
    () => {
      return <Popover />;
    },
    {
      info: {
        propTablesExclude: [
          CytoscapeContext.Provider,
          MockApmPluginContextWrapper,
          MockUrlParamsContextProvider,
          EuiThemeProvider,
        ],
        source: false,
      },
    }
  );

storiesOf('app/ServiceMap/Popover/ServiceStatsList', module)
  .addDecorator((storyFn) => <EuiThemeProvider>{storyFn()}</EuiThemeProvider>)
  .add(
    'example',
    () => (
      <ServiceStatsList
        avgCpuUsage={0.32809666568309237}
        avgMemoryUsage={0.5504868173242986}
        transactionStats={{
          avgRequestsPerMinute: 164.47222031860858,
          avgTransactionDuration: 61634.38905590272,
        }}
        avgErrorRate={0.556068173242986}
      />
    ),
    { info: { propTablesExclude: [EuiThemeProvider] } }
  )
  .add(
    'loading',
    () => (
      <ServiceStatsList
        avgCpuUsage={null}
        avgErrorRate={null}
        avgMemoryUsage={null}
        transactionStats={{
          avgRequestsPerMinute: null,
          avgTransactionDuration: null,
        }}
      />
    ),
    { info: { propTablesExclude: [EuiThemeProvider] } }
  )
  .add(
    'some null values',
    () => (
      <ServiceStatsList
        avgCpuUsage={null}
        avgErrorRate={0.615972134074397}
        avgMemoryUsage={null}
        transactionStats={{
          avgRequestsPerMinute: 8.439583235652972,
          avgTransactionDuration: 238792.54809512055,
        }}
      />
    ),
    { info: { propTablesExclude: [EuiThemeProvider] } }
  )
  .add(
    'all null values',
    () => (
      <ServiceStatsList
        avgCpuUsage={null}
        avgErrorRate={null}
        avgMemoryUsage={null}
        transactionStats={{
          avgRequestsPerMinute: null,
          avgTransactionDuration: null,
        }}
      />
    ),
    { info: { propTablesExclude: [EuiThemeProvider] } }
  );
