/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render } from '@testing-library/react';
import { QueryClientProvider } from 'react-query';

import { OsqueryActionResults } from '.';
import { queryClient } from '../../query_client';
import { useKibana } from '../../common/lib/kibana';
import * as useActions from '../../actions/use_all_actions';
import { PERMISSION_DENIED } from '../osquery_action/translations';
import * as privileges from '../../action_results/use_action_privileges';

jest.mock('../../common/lib/kibana');

const useKibanaMock = useKibana as jest.MockedFunction<typeof useKibana>;
const TEST_QUERY = 'select * from uptime';
const TEST_AGENT = 'agent1';

const enablePrivileges = () => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  jest.spyOn(privileges, 'useActionResultsPrivileges').mockImplementation(() => ({
    data: true,
  }));
};

const defaultProps = {
  agentIds: [TEST_AGENT],
  ruleName: 'Test-rule',
  ruleActions: [{ action_type_id: 'action1' }, { action_type_id: 'action2' }],
  eventDetailId: '123',
};

const defaultPermissions = {
  osquery: {
    runSavedQueries: false,
    readSavedQueries: false,
  },
};

const mockKibana = (permissionType: unknown = defaultPermissions) => {
  useKibanaMock.mockReturnValue({
    services: {
      application: {
        capabilities: permissionType,
      },
      notifications: {
        toasts: jest.fn(),
      },
    },
  } as unknown as ReturnType<typeof useKibana>);
};

const renderWithContext = (Element: React.ReactElement) =>
  render(
    <IntlProvider locale={'en'}>
      <QueryClientProvider client={queryClient}>{Element}</QueryClientProvider>
    </IntlProvider>
  );

describe('Osquery Results', () => {
  beforeAll(() => {
    window.IntersectionObserver = jest.fn(() => ({
      root: null,
      rootMargin: '',
      thresholds: [],
      takeRecords: jest.fn(),
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    }));
    mockKibana();
    // @ts-expect-error update types
    jest.spyOn(useActions, 'useInfiniteAllActions').mockImplementation(() => ({
      data: {
        pages: [
          {
            actions: [
              {
                _source: {
                  '@timestamp': 'test',
                  action_id: 'action_id_test',
                  data: {
                    query: TEST_QUERY,
                  },
                },
                _id: 'test',
              },
            ],
          },
        ],
      },
    }));
  });
  it('should validate permissions', async () => {
    const { queryByText } = renderWithContext(<OsqueryActionResults {...defaultProps} />);
    expect(queryByText(PERMISSION_DENIED)).toBeInTheDocument();
  });
  it('return results table', async () => {
    enablePrivileges();
    const { getByText, queryByText, getByTestId } = renderWithContext(
      <OsqueryActionResults {...defaultProps} />
    );
    expect(queryByText(PERMISSION_DENIED)).not.toBeInTheDocument();
    expect(getByTestId('osquery-results-comment')).toBeInTheDocument();
    expect(getByText(TEST_AGENT)).toBeInTheDocument();
    expect(getByText(TEST_QUERY)).toBeInTheDocument();
    expect(getByText('Test-rule')).toBeInTheDocument();
    expect(getByText('attached query')).toBeInTheDocument();
  });
});
