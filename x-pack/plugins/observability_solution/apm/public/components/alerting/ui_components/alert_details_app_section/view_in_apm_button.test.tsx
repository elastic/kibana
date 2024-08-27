/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { renderReactTestingLibraryWithI18n as render } from '@kbn/test-jest-helpers';

import { ViewInAPMButton } from './view_in_apm_button';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  ...jest.requireActual('@kbn/kibana-react-plugin/public'),
  useKibana: jest.fn().mockReturnValue({
    services: {},
  }),
}));

const { useKibana } = jest.requireMock('@kbn/kibana-react-plugin/public');

describe('ViewInApmButton', () => {
  const config = {
    serviceName: 'testService',
    environment: 'testEnvironment',
    transactionName: 'testTransaction',
    transactionType: 'testTransactionType',
    from: 'now-15m',
    to: 'now',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('hides button when share plugin is not available', () => {
    const { queryByText } = render(<ViewInAPMButton {...config} />);

    expect(queryByText('View in APM')).not.toBeInTheDocument();
  });

  it('reners correctly', () => {
    useKibana.mockReturnValue({
      services: {
        share: {
          url: {
            locators: {
              // @ts-ignore
              get: () => ({
                navigate: jest.fn(),
              }),
            },
          },
        },
      },
    });
    const { getByText } = render(<ViewInAPMButton {...config} />);

    expect(getByText('View in APM')).toBeInTheDocument();
  });
});
