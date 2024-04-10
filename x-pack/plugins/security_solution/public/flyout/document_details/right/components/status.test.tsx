/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { RightPanelContext } from '../context';
import { DocumentStatus } from './status';
import { mockDataFormattedForFieldBrowser } from '../../shared/mocks/mock_data_formatted_for_field_browser';
import { TestProviders } from '../../../../common/mock';
import { useAlertsActions } from '../../../../detections/components/alerts_table/timeline_actions/use_alerts_actions';
import { STATUS_BUTTON_TEST_ID } from './test_ids';
import { TestProvider } from '@kbn/expandable-flyout/src/test/provider';

jest.mock('../../../../detections/components/alerts_table/timeline_actions/use_alerts_actions');

const renderStatus = (contextValue: RightPanelContext) =>
  render(
    <TestProviders>
      <TestProvider>
        <RightPanelContext.Provider value={contextValue}>
          <DocumentStatus />
        </RightPanelContext.Provider>
      </TestProvider>
    </TestProviders>
  );

const actionItem = {
  key: 'key',
  name: 'name',
  'data-test-subj': 'data-test-subj',
};

(useAlertsActions as jest.Mock).mockReturnValue({
  actionItems: [actionItem],
});

describe('<DocumentStatus />', () => {
  it('should render status information', () => {
    const contextValue = {
      eventId: 'eventId',
      browserFields: {},
      dataFormattedForFieldBrowser: mockDataFormattedForFieldBrowser,
      scopeId: 'scopeId',
    } as unknown as RightPanelContext;

    const { getByTestId, getByText } = renderStatus(contextValue);

    expect(getByTestId(STATUS_BUTTON_TEST_ID)).toBeInTheDocument();
    expect(getByText('open')).toBeInTheDocument();

    getByTestId(STATUS_BUTTON_TEST_ID).click();
    expect(getByTestId('data-test-subj')).toBeInTheDocument();
  });

  it('should render empty tag when status is not available', () => {
    const contextValue = {
      eventId: 'eventId',
      browserFields: {},
      dataFormattedForFieldBrowser: [],
      scopeId: 'scopeId',
    } as unknown as RightPanelContext;

    const { container } = renderStatus(contextValue);

    expect(container).toHaveTextContent('Status—');
  });

  it('should render empty tag in preview mode', () => {
    const contextValue = {
      eventId: 'eventId',
      browserFields: {},
      dataFormattedForFieldBrowser: mockDataFormattedForFieldBrowser,
      scopeId: 'scopeId',
      isPreview: true,
    } as unknown as RightPanelContext;

    const { container } = renderStatus(contextValue);

    expect(container).toHaveTextContent('Status—');
  });
});
