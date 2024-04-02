/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react';
import { LeftPanelTour } from './tour';
import { LeftPanelContext } from '../context';
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

const renderLeftPanelTour = (context: LeftPanelContext = mockContextValue) =>
  render(
    <TestProviders store={mockStore}>
      <LeftPanelContext.Provider value={context}>
        <LeftPanelTour />
        {Object.values(FLYOUT_TOUR_CONFIG_ANCHORS).map((i, idx) => (
          <div key={idx} data-test-subj={i} />
        ))}
      </LeftPanelContext.Provider>
    </TestProviders>
  );

describe('<LeftPanelTour />', () => {
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

  it('should render left panel tour for alerts starting as step 4', async () => {
    storageMock.set('securitySolution.documentDetails.newFeaturesTour.v8.14', {
      currentTourStep: 4,
      isTourActive: true,
      tourPopoverWidth: 300,
      tourSubtitle: 'test',
    });

    const { getByText, getByTestId } = renderLeftPanelTour();
    await waitFor(() => {
      expect(getByTestId('flyout-tour-step-4')).toBeVisible();
    });
    fireEvent.click(getByText('Next'));
    await waitFor(() => {
      expect(getByTestId('flyout-tour-step-5')).toBeVisible();
    });
    await waitFor(() => {
      expect(getByText('Finish')).toBeVisible();
    });
  });

  it('should render left panel tour for preview starting as step 3', async () => {
    storageMock.set('securitySolution.documentDetails.newFeaturesTour.v8.14', {
      currentTourStep: 3,
      isTourActive: true,
      tourPopoverWidth: 300,
      tourSubtitle: 'test',
    });

    const { getByText, getByTestId } = renderLeftPanelTour({
      ...mockContextValue,
      isPreview: true,
    });
    await waitFor(() => {
      expect(getByTestId('flyout-tour-step-3')).toBeVisible();
    });
    fireEvent.click(getByText('Next'));
    await waitFor(() => {
      expect(getByTestId('flyout-tour-step-4')).toBeVisible();
    });
    await waitFor(() => {
      expect(getByText('Finish')).toBeVisible();
    });
  });

  it('should render left panel tour for non-alerts starting as step 3', async () => {
    storageMock.set('securitySolution.documentDetails.newFeaturesTour.v8.14', {
      currentTourStep: 3,
      isTourActive: true,
      tourPopoverWidth: 300,
      tourSubtitle: 'test',
    });

    const { getByText, getByTestId } = renderLeftPanelTour({
      ...mockContextValue,
      getFieldsData: () => '',
    });
    await waitFor(() => {
      expect(getByTestId('flyout-tour-step-3')).toBeVisible();
    });
    fireEvent.click(getByText('Next'));
    await waitFor(() => {
      expect(getByTestId('flyout-tour-step-4')).toBeVisible();
    });
    await waitFor(() => {
      expect(getByText('Finish')).toBeVisible();
    });
  });
});
