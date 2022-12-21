/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import { TestProviders } from '../../../mock';

import { useActionCellDataProvider } from '../table/use_action_cell_data_provider';
import { useAlertPrevalence } from '../../../containers/alerts/use_alert_prevalence';
import { RelatedAlertsBySession } from './related_alerts_by_session';
import { SESSION_LOADING, SESSION_ERROR, SESSION_COUNT } from './translations';
import { ACTION_INVESTIGATE_IN_TIMELINE } from '../../../../detections/components/alerts_table/translations';

jest.mock('../table/use_action_cell_data_provider', () => ({
  useActionCellDataProvider: jest.fn(),
}));
const mockUseActionCellDataProvider = useActionCellDataProvider as jest.Mock;
jest.mock('../../../containers/alerts/use_alert_prevalence', () => ({
  useAlertPrevalence: jest.fn(),
}));
const mockUseAlertPrevalence = useAlertPrevalence as jest.Mock;

const testEventId = '20398h209482';
const testData = {
  field: 'process.entry_leader.entity_id',
  data: ['2938hr29348h9489r8'],
  isObjectArray: false,
};

describe('RelatedAlertsBySession', () => {
  it('shows a loading message when data is loading', () => {
    mockUseAlertPrevalence.mockReturnValue({
      error: false,
      count: undefined,
      alertIds: undefined,
    });
    render(
      <TestProviders>
        <RelatedAlertsBySession
          browserFields={{}}
          data={testData}
          eventId={testEventId}
          scopeId=""
        />
      </TestProviders>
    );

    expect(screen.getByText(SESSION_LOADING)).toBeInTheDocument();
  });

  it('shows an error message when data failed to load', () => {
    mockUseAlertPrevalence.mockReturnValue({
      error: true,
      count: undefined,
      alertIds: undefined,
    });
    render(
      <TestProviders>
        <RelatedAlertsBySession
          browserFields={{}}
          data={testData}
          eventId={testEventId}
          scopeId=""
        />
      </TestProviders>
    );

    expect(screen.getByText(SESSION_ERROR)).toBeInTheDocument();
  });

  it('shows an empty state when no alerts exist', () => {
    mockUseAlertPrevalence.mockReturnValue({
      error: false,
      count: 0,
      alertIds: [],
    });
    render(
      <TestProviders>
        <RelatedAlertsBySession
          browserFields={{}}
          data={testData}
          eventId={testEventId}
          scopeId=""
        />
      </TestProviders>
    );

    expect(screen.getByText(SESSION_COUNT(0))).toBeInTheDocument();
  });

  it('shows the correct count and renders the timeline button', async () => {
    mockUseAlertPrevalence.mockReturnValue({
      error: false,
      count: 2,
      alertIds: ['223', '2323'],
    });
    mockUseActionCellDataProvider.mockReturnValue({
      dataProviders: [{}, {}],
    });

    render(
      <TestProviders>
        <RelatedAlertsBySession
          browserFields={{}}
          data={testData}
          eventId={testEventId}
          scopeId=""
        />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.getByText(SESSION_COUNT(2))).toBeInTheDocument();
      expect(screen.getByText(ACTION_INVESTIGATE_IN_TIMELINE)).toBeInTheDocument();
    });
  });
});
