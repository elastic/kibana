/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, act, fireEvent, waitForElementToBeRemoved, waitFor } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

import { AgentStatusFilter } from './agent_status_filter';

const PARTIAL_TOUR_TEXT = 'Some agents have become inactive and have been hidden';
const mockStorage: Record<any, any> = {};

jest.mock('../../../../../../hooks/use_core', () => {
  return {
    useStartServices: jest.fn(() => ({
      uiSettings: {
        get: jest.fn(() => false),
      },
      storage: {
        get: jest.fn((key) => mockStorage[key]),
        set: jest.fn((key, val) => (mockStorage[key] = val)),
      },
    })),
  };
});

const renderComponent = (props: React.ComponentProps<typeof AgentStatusFilter>) => {
  return render(
    <IntlProvider timeZone="UTC" locale="en">
      <AgentStatusFilter {...props} />
    </IntlProvider>
  );
};

describe('AgentStatusFilter', () => {
  it('Renders all statuses', () => {
    const { getByText } = renderComponent({
      selectedStatus: [],
      onSelectedStatusChange: () => {},
      totalInactiveAgents: 0,
      isOpenByDefault: true,
    });

    expect(getByText('Healthy')).toBeInTheDocument();
    expect(getByText('Unhealthy')).toBeInTheDocument();
    expect(getByText('Updating')).toBeInTheDocument();
    expect(getByText('Offline')).toBeInTheDocument();
    expect(getByText('Inactive')).toBeInTheDocument();
    expect(getByText('Unenrolled')).toBeInTheDocument();
  });

  it('Shows tour and inactive count if first time seeing newly inactive agents', async () => {
    const { container, getByText, queryByText } = renderComponent({
      selectedStatus: [],
      onSelectedStatusChange: () => {},
      totalInactiveAgents: 999,
    });

    await act(async () => {
      expect(getByText(PARTIAL_TOUR_TEXT, { exact: false })).toBeVisible();

      const statusFilterButton = container.querySelector(
        '[data-test-subj="agentList.statusFilter"]'
      );

      expect(statusFilterButton).not.toBeNull();

      fireEvent.click(statusFilterButton!);

      await waitForElementToBeRemoved(() => queryByText(PARTIAL_TOUR_TEXT, { exact: false }));

      expect(getByText('999')).toBeInTheDocument();

      expect(mockStorage['fleet.inactiveAgentsTour']).toEqual({ active: false });
    });
  });

  it('Should not show tour if previously been dismissed', async () => {
    mockStorage['fleet.inactiveAgentsTour'] = { active: false };

    const { queryByText } = renderComponent({
      selectedStatus: [],
      onSelectedStatusChange: () => {},
      totalInactiveAgents: 999,
    });
    await act(async () => {
      expect(queryByText(PARTIAL_TOUR_TEXT, { exact: false })).toBeNull();
    });
  });

  it('Should should show difference between last seen inactive agents and total agents', async () => {
    mockStorage['fleet.lastSeenInactiveAgentsCount'] = '100';

    const { getByText, getByTestId } = renderComponent({
      selectedStatus: [],
      onSelectedStatusChange: () => {},
      totalInactiveAgents: 999,
    });

    await act(async () => {
      const statusFilterButton = getByTestId('agentList.statusFilter');

      fireEvent.click(statusFilterButton);

      await waitFor(() => {
        expect(getByTestId('agentList.agentStatusFilterOptions')).toBeInTheDocument();
        expect(getByText('899')).toBeInTheDocument();
      });
    });
  });
});
