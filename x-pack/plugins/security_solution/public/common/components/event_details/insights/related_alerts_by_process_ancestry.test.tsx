/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { TestProviders } from '../../../mock';

import { useAlertPrevalenceFromProcessTree } from '../../../containers/alerts/use_alert_prevalence_from_process_tree';
import { RelatedAlertsByProcessAncestry } from './related_alerts_by_process_ancestry';
import { ACTION_INVESTIGATE_IN_TIMELINE } from '../../../../detections/components/alerts_table/translations';

jest.mock('../../../containers/alerts/use_alert_prevalence_from_process_tree', () => ({
  useAlertPrevalenceFromProcessTree: jest.fn(),
}));
const mockUseAlertPrevalenceFromProcessTree = useAlertPrevalenceFromProcessTree as jest.Mock;

describe('RelatedAlertsByProcessAncestry', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('shows an accordion and does not fetch data right away', () => {
    render(
      <TestProviders>
        <RelatedAlertsByProcessAncestry
          eventId="random"
          data={{
            field: 'testfield',
            values: ['test value'],
            isObjectArray: false,
          }}
        />
      </TestProviders>
    );

    expect(screen.getByText('Related alerts by process ancestry')).toBeInTheDocument();
    expect(mockUseAlertPrevalenceFromProcessTree).not.toHaveBeenCalled();
  });

  it('shows a loading indicator and starts to fetch data when clicked', () => {
    mockUseAlertPrevalenceFromProcessTree.mockReturnValue({
      loading: true,
    });

    render(
      <TestProviders>
        <RelatedAlertsByProcessAncestry
          eventId="random"
          data={{
            field: 'testfield',
            values: ['test value'],
            isObjectArray: false,
          }}
        />
      </TestProviders>
    );

    userEvent.click(screen.getByText('Related alerts by process ancestry'));
    expect(mockUseAlertPrevalenceFromProcessTree).toHaveBeenCalled();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows an error message when the request fails', () => {
    mockUseAlertPrevalenceFromProcessTree.mockReturnValue({
      loading: false,
      error: true,
    });

    render(
      <TestProviders>
        <RelatedAlertsByProcessAncestry
          eventId="random"
          data={{
            field: 'testfield',
            values: ['test value'],
            isObjectArray: false,
          }}
        />
      </TestProviders>
    );

    userEvent.click(screen.getByText('Related alerts by process ancestry'));
    expect(screen.getByText(/Failed/)).toBeInTheDocument();
  });

  it('renders the text with a count and a timeline button when the request works', async () => {
    const mockAlertIds = ['1', '2'];
    mockUseAlertPrevalenceFromProcessTree.mockReturnValue({
      loading: false,
      error: false,
      alertIds: mockAlertIds,
    });

    render(
      <TestProviders>
        <RelatedAlertsByProcessAncestry
          eventId="random"
          data={{
            field: 'testfield',
            values: ['test value'],
            isObjectArray: false,
          }}
        />
      </TestProviders>
    );

    userEvent.click(screen.getByText('Related alerts by process ancestry'));
    await waitFor(() => {
      expect(screen.getByText('2 alerts by process ancestry')).toBeInTheDocument();

      expect(
        screen.getByRole('button', { name: ACTION_INVESTIGATE_IN_TIMELINE })
      ).toBeInTheDocument();
    });
  });
});
