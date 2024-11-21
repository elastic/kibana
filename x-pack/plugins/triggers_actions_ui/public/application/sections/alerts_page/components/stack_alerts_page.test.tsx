/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { screen, waitFor } from '@testing-library/react';

import { StackAlertsPage } from './stack_alerts_page';
import { getIsExperimentalFeatureEnabled } from '../../../../common/get_experimental_features';
import { createAppMockRenderer } from '../../test_utils';
import { mockRuleTypes } from '../../../mock/rule_types_index';
import { loadRuleTypes } from '../../../lib/rule_api/rule_types';
import { alertsTableQueryClient } from '../../alerts_table/query_client';
import { UrlSyncedAlertsSearchBar } from '../../alerts_search_bar/url_synced_alerts_search_bar';
import { RuleType } from '@kbn/alerting-types';

jest.mock('../../../../common/get_experimental_features');
jest.mock('../../../../common/lib/kibana');

jest.mock('../../../lib/rule_api/rule_types');
const mockLoadRuleTypes = jest.mocked(loadRuleTypes).mockResolvedValue(mockRuleTypes);

jest.mock('../../alerts_search_bar/url_synced_alerts_search_bar');
const mockUrlSyncedAlertsSearchBar = jest
  .mocked(UrlSyncedAlertsSearchBar)
  .mockImplementation(() => (
    <div data-test-subj="urlSyncedAlertsSearchBar">{'UrlSyncedAlertsSearchBar'}</div>
  ));

const mockAlertsTable = jest.fn(() => <div data-test-subj="alertsTable">{'Alerts table'}</div>);
jest.mock('../../alerts_table/alerts_table_state', () => mockAlertsTable);

jest.mocked(getIsExperimentalFeatureEnabled).mockImplementation(() => false);

describe('StackAlertsPage', () => {
  const appMockRender = createAppMockRenderer();

  afterEach(() => {
    appMockRender.queryClient.clear();
    alertsTableQueryClient.clear();
    jest.clearAllMocks();
  });

  it('renders the stack alerts page with the correct permissions', async () => {
    appMockRender.render(<StackAlertsPage />);

    expect(await screen.findByTestId('stackAlertsPageContent')).toBeInTheDocument();
    expect(screen.getByTestId('alertsTable')).toBeInTheDocument();
    expect(screen.getByTestId('urlSyncedAlertsSearchBar')).toBeInTheDocument();
  });

  it('shows the missing permission prompt if the user is not allowed to read any rules', async () => {
    mockLoadRuleTypes.mockResolvedValue([]);
    appMockRender.render(<StackAlertsPage />);

    expect(await screen.findByTestId('noPermissionPrompt')).toBeInTheDocument();
  });

  it('uses only authorized featureIds', async () => {
    mockLoadRuleTypes.mockResolvedValue([
      {
        id: 'test',
        name: 'test',
        authorizedConsumers: { alerts: { read: true, all: true } },
        producer: 'stackAlerts',
      } as unknown as RuleType,
    ]);
    appMockRender.render(<StackAlertsPage />);

    await waitFor(() =>
      expect(mockUrlSyncedAlertsSearchBar).toHaveBeenCalledWith(
        expect.objectContaining({
          featureIds: ['stackAlerts'],
        }),
        expect.anything()
      )
    );
  });
});
