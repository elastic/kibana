/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { CoreStart } from 'src/core/public';
import { createKibanaReactContext } from '../../../../../../../src/plugins/kibana_react/public';
import { ApmPluginContextValue } from '../../../context/ApmPluginContext';
import {
  mockApmPluginContextValue,
  MockApmPluginContextWrapper,
} from '../../../context/ApmPluginContext/MockApmPluginContext';
import { MockUrlParamsContextProvider } from '../../../context/UrlParamsContext/MockUrlParamsContextProvider';
import * as useDynamicIndexPatternHooks from '../../../hooks/useDynamicIndexPattern';
import * as callApmApi from '../../../services/rest/createCallApmApi';
import { FETCH_STATUS } from '../../../hooks/useFetcher';
import { renderWithTheme } from '../../../utils/testHelpers';
import { ServiceOverview } from './';
import { waitFor } from '@testing-library/dom';

const KibanaReactContext = createKibanaReactContext({
  usageCollection: { reportUiStats: () => {} },
} as Partial<CoreStart>);

function Wrapper({ children }: { children?: ReactNode }) {
  const value = ({
    ...mockApmPluginContextValue,
    core: {
      ...mockApmPluginContextValue.core,
      http: {
        basePath: { prepend: () => {} },
        get: () => {},
      },
    },
  } as unknown) as ApmPluginContextValue;

  return (
    <MemoryRouter keyLength={0}>
      <KibanaReactContext.Provider>
        <MockApmPluginContextWrapper value={value}>
          <MockUrlParamsContextProvider
            params={{ rangeFrom: 'now-15m', rangeTo: 'now' }}
          >
            {children}
          </MockUrlParamsContextProvider>
        </MockApmPluginContextWrapper>
      </KibanaReactContext.Provider>
    </MemoryRouter>
  );
}

describe('ServiceOverview', () => {
  it('renders', async () => {
    jest
      .spyOn(useDynamicIndexPatternHooks, 'useDynamicIndexPattern')
      .mockReturnValue({
        indexPattern: undefined,
        status: FETCH_STATUS.SUCCESS,
      });

    const calls = {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      'GET /api/apm/services/{serviceName}/error_groups': {
        error_groups: [],
        total_error_groups: 0,
      },
      // eslint-disable-next-line @typescript-eslint/naming-convention
      'GET /api/apm/services/{serviceName}/overview_transaction_groups': {
        transactionGroups: [],
        totalTransactionGroups: 0,
        isAggregationAccurate: true,
      },
      'GET /api/apm/services/{serviceName}/dependencies': [],
    };

    jest.spyOn(callApmApi, 'createCallApmApi').mockImplementation(() => {});

    jest.spyOn(callApmApi, 'callApmApi').mockImplementation(({ endpoint }) => {
      const response = calls[endpoint as keyof typeof calls];

      return response
        ? Promise.resolve(response)
        : Promise.reject(`Response for ${endpoint} is not defined`);
    });

    const { findAllByText } = renderWithTheme(
      <ServiceOverview serviceName="test service name" />,
      {
        wrapper: Wrapper,
      }
    );

    await waitFor(() =>
      expect(callApmApi.callApmApi).toHaveBeenCalledTimes(
        Object.keys(calls).length
      )
    );

    expect((await findAllByText('Latency')).length).toBeGreaterThan(0);
  });
});
