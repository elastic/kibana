/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';

import { OsqueryActionResults } from '.';
import { queryClient } from '../../query_client';
import { useKibana } from '../../common/lib/kibana';
import * as useAllLiveQueries from '../../actions/use_all_live_queries';
import * as useLiveQueryDetails from '../../actions/use_live_query_details';
import { PERMISSION_DENIED } from '../osquery_action/translations';
import * as privileges from '../../action_results/use_action_privileges';
import { defaultLiveQueryDetails, DETAILS_QUERY, getMockedKibanaConfig } from './test_utils';

jest.mock('../../common/lib/kibana');

const useKibanaMock = useKibana as jest.MockedFunction<typeof useKibana>;

const enablePrivileges = () => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  jest.spyOn(privileges, 'useActionResultsPrivileges').mockImplementation(() => ({
    data: true,
  }));
};

const defaultProps = {
  agentIds: ['agent1'],
  ruleName: ['Test-rule'],
  ruleActions: [{ action_type_id: 'action1' }, { action_type_id: 'action2' }],
  alertId: 'test-alert-id',
};

const defaultPermissions = {
  osquery: {
    runSavedQueries: false,
    readSavedQueries: false,
  },
  discover: {
    show: true,
  },
};

const mockKibana = (permissionType: unknown = defaultPermissions) => {
  const mockedKibana = getMockedKibanaConfig(permissionType);
  useKibanaMock.mockReturnValue(mockedKibana);
};

const renderWithContext = (Element: React.ReactElement) =>
  render(
    <IntlProvider locale={'en'}>
      <QueryClientProvider client={queryClient}>{Element}</QueryClientProvider>
    </IntlProvider>
  );

describe('Osquery Results', () => {
  beforeAll(() => {
    mockKibana();
    // @ts-expect-error update types
    jest.spyOn(useAllLiveQueries, 'useAllLiveQueries').mockImplementation(() => ({
      data: {
        data: {
          items: [
            {
              fields: {
                action_id: ['sfdsfds'],
                'queries.action_id': ['dsadas'],
                'queries.query': [DETAILS_QUERY],
                '@timestamp': ['2022-09-08T18:16:30.256Z'],
              },
            },
          ],
        },
      },
    }));

    jest
      .spyOn(useLiveQueryDetails, 'useLiveQueryDetails')
      .mockImplementation(() => defaultLiveQueryDetails);
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
    expect(getByTestId('osquery-results-comment'));
    expect(getByText('Test-rule')).toBeInTheDocument();
    expect(getByText('attached query')).toBeInTheDocument();
  });
});
