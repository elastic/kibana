/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { waitFor } from '@testing-library/react';

import { GlobalAlertsPage } from './global_alerts_page';
import { getIsExperimentalFeatureEnabled } from '../../../common/get_experimental_features';
import { AppMockRenderer, createAppMockRenderer } from '../test_utils';
import { ruleTypesIndex } from '../../mock/rule_types_index';

jest.mock('../../../common/get_experimental_features');
jest.mock('../../../common/lib/kibana');

jest.mock('../../hooks/use_load_rule_types_query', () => ({
  useLoadRuleTypesQuery: jest.fn(),
}));

jest.mock('../alerts_search_bar/url_synced_alerts_search_bar', () => ({
  UrlSyncedAlertsSearchBar: () => (
    <div data-test-subj="urlSyncedAlertsSearchBar">{'UrlSyncedAlertsSearchBar'}</div>
  ),
}));

const mockAlertsTable = jest.fn(() => <div data-test-subj="alertsTable">{'Alerts table'}</div>);
jest.mock('../alerts_table/alerts_table_state', () => mockAlertsTable);

describe('GlobalAlertsPage', () => {
  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
    (getIsExperimentalFeatureEnabled as jest.Mock).mockImplementation(() => false);
  });

  it('renders the global alerts page with the correct permissions', async () => {
    const { useLoadRuleTypesQuery } = jest.requireMock('../../hooks/use_load_rule_types_query');
    useLoadRuleTypesQuery.mockReturnValue({
      ruleTypesState: {
        data: ruleTypesIndex,
        initialLoad: false,
      },
      authorizedToReadAnyRules: true,
    });
    const { getByTestId } = appMockRender.render(<GlobalAlertsPage />);

    await waitFor(() => {
      expect(getByTestId('globalAlertsPageContent')).toBeInTheDocument();
      expect(getByTestId('alertsTable')).toBeInTheDocument();
      expect(getByTestId('urlSyncedAlertsSearchBar')).toBeInTheDocument();
    });
  });

  it('shows the missing permission prompt if the user is not allowed to read any rules', async () => {
    const { useLoadRuleTypesQuery } = jest.requireMock('../../hooks/use_load_rule_types_query');
    useLoadRuleTypesQuery.mockReturnValue({
      ruleTypesState: {
        data: ruleTypesIndex,
        initialLoad: false,
      },
      authorizedToReadAnyRules: false,
    });
    const { getByTestId } = appMockRender.render(<GlobalAlertsPage />);

    await waitFor(() => expect(getByTestId('noPermissionPrompt')).toBeInTheDocument());
  });
});
