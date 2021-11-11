/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { __IntlProvider as IntlProvider } from '@kbn/i18n/react';
import { render, screen, waitFor } from '@testing-library/react';
import React, { ReactNode } from 'react';
import type { IKibanaSearchResponse } from 'src/plugins/data/public';
import { EuiThemeProvider } from 'src/plugins/kibana_react/common';
import type { LatencyCorrelationsResponse } from '../../../../common/correlations/latency_correlations/types';
import { MockApmAppContextProvider } from '../../../context/mock_apm_app/mock_apm_app_context';
import { LatencyCorrelations } from './latency_correlations';

function Wrapper({
  children,
  dataSearchResponse,
}: {
  children?: ReactNode;
  dataSearchResponse: IKibanaSearchResponse<LatencyCorrelationsResponse>;
}) {
  return (
    <IntlProvider locale="en">
      <EuiThemeProvider>
        <MockApmAppContextProvider
          value={{
            path: '/services/the-service-name/transactions/view?transactionName=the-transaction-name&rangeFrom=now-15m&rangeTo=now',
          }}
        >
          {children}
        </MockApmAppContextProvider>
      </EuiThemeProvider>
    </IntlProvider>
  );
}

describe('correlations', () => {
  describe('LatencyCorrelations', () => {
    it('shows loading indicator when the service is running and returned no results yet', async () => {
      render(<LatencyCorrelations onFilter={jest.fn()} />, {
        initialProps: {
          dataSearchResponse: {
            isRunning: true,
            rawResponse: {
              ccsWarning: false,
              latencyCorrelations: [],
            },
          },
        },
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(screen.getByTestId('apmCorrelationsChart')).toBeInTheDocument();
        expect(screen.getByTestId('loading')).toBeInTheDocument();
      });
    });

    it("doesn't show loading indicator when the service isn't running", async () => {
      render(<LatencyCorrelations onFilter={jest.fn()} />, {
        initialProps: {
          dataSearchResponse: {
            isRunning: false,
            rawResponse: {
              ccsWarning: false,
              latencyCorrelations: [],
            },
          },
        },
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(screen.getByTestId('apmCorrelationsChart')).toBeInTheDocument();
        expect(screen.queryByTestId('loading')).toBeNull(); // it doesn't exist
      });
    });
  });
});
