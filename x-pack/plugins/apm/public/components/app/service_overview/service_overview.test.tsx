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
import * as useFetcherHooks from '../../../hooks/useFetcher';
import { FETCH_STATUS } from '../../../hooks/useFetcher';
import * as useAnnotationsHooks from '../../../hooks/use_annotations';
import * as useTransactionBreakdownHooks from '../../../hooks/use_transaction_breakdown';
import { renderWithTheme } from '../../../utils/testHelpers';
import { ServiceOverview } from './';

const KibanaReactContext = createKibanaReactContext({
  usageCollection: { reportUiCounter: () => {} },
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
  it('renders', () => {
    jest
      .spyOn(useAnnotationsHooks, 'useAnnotations')
      .mockReturnValue({ annotations: [] });
    jest
      .spyOn(useDynamicIndexPatternHooks, 'useDynamicIndexPattern')
      .mockReturnValue({
        indexPattern: undefined,
        status: FETCH_STATUS.SUCCESS,
      });
    jest.spyOn(useFetcherHooks, 'useFetcher').mockReturnValue({
      data: {
        items: [],
        tableOptions: {
          pageIndex: 0,
          sort: { direction: 'desc', field: 'test field' },
        },
        totalItemCount: 0,
      },
      refetch: () => {},
      status: FETCH_STATUS.SUCCESS,
    });
    jest
      .spyOn(useTransactionBreakdownHooks, 'useTransactionBreakdown')
      .mockReturnValue({
        data: { timeseries: [] },
        error: undefined,
        status: FETCH_STATUS.SUCCESS,
      });

    expect(() =>
      renderWithTheme(<ServiceOverview serviceName="test service name" />, {
        wrapper: Wrapper,
      })
    ).not.toThrowError();
  });
});
