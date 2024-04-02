/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react';
import { RightPanelTour } from './tour';
import { RightPanelContext } from '../context';
import { mockContextValue } from '../mocks/mock_context';
import {
  createMockStore,
  createSecuritySolutionStorageMock,
  TestProviders,
} from '../../../../common/mock';
import { useKibana as mockUseKibana } from '../../../../common/lib/kibana/__mocks__';
import { useKibana } from '../../../../common/lib/kibana';
import { FLYOUT_TOUR_CONFIG_ANCHORS } from '../../shared/components/tour_step_config';

jest.mock('../../../../common/lib/kibana');

const mockedUseKibana = mockUseKibana();

const { storage: storageMock } = createSecuritySolutionStorageMock();
const mockStore = createMockStore(undefined, undefined, undefined, {
  ...storageMock,
});

const renderRightPanelTour = (context: RightPanelContext = mockContextValue) =>
  render(
    <TestProviders store={mockStore}>
      <RightPanelContext.Provider value={context}>
        <RightPanelTour />
        {Object.values(FLYOUT_TOUR_CONFIG_ANCHORS).map((i, idx) => (
          <div key={idx} data-test-subj={i} />
        ))}
      </RightPanelContext.Provider>
    </TestProviders>
  );

describe('<RightPanelTour />', () => {
  beforeEach(() => {
    (useKibana as jest.Mock).mockReturnValue({
      ...mockedUseKibana,
      services: {
        ...mockedUseKibana.services,
        storage: storageMock,
      },
    });

    storageMock.clear();
  });

  it('should render full tour for alerts', async () => {
    const { getByText, getByTestId } = renderRightPanelTour();
    await waitFor(() => {
      expect(getByTestId('flyout-tour-step-1')).toBeVisible();
    });
    fireEvent.click(getByText('Next'));
    await waitFor(() => {
      expect(getByTestId('flyout-tour-step-2')).toBeVisible();
    });
    fireEvent.click(getByText('Next'));
    await waitFor(() => {
      expect(getByTestId('flyout-tour-step-3')).toBeVisible();
    });
    fireEvent.click(getByText('Next'));
  });

  it('should render partial tour for preview', async () => {
    const { getByText, getByTestId } = renderRightPanelTour({
      ...mockContextValue,
      isPreview: true,
    });
    await waitFor(() => {
      expect(getByTestId('flyout-tour-step-1')).toBeVisible();
    });
    fireEvent.click(getByText('Next'));
    await waitFor(() => {
      expect(getByTestId('flyout-tour-step-2')).toBeVisible();
    });
    fireEvent.click(getByText('Next'));
  });

  it('should render partial tour for non-alerts', async () => {
    const { getByText, getByTestId } = renderRightPanelTour({
      ...mockContextValue,
      getFieldsData: () => '',
    });
    await waitFor(() => {
      expect(getByTestId('flyout-tour-step-1')).toBeVisible();
    });
    fireEvent.click(getByText('Next'));
    await waitFor(() => {
      expect(getByTestId('flyout-tour-step-2')).toBeVisible();
    });
    fireEvent.click(getByText('Next'));
  });
});
