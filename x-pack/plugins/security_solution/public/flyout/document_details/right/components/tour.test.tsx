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
import { FLYOUT_TOUR_CONFIG_ANCHORS } from '../../shared/utils/tour_step_config';
import { useIsTimelineFlyoutOpen } from '../../shared/hooks/use_is_timeline_flyout_open';
import { FLYOUT_TOUR_TEST_ID } from '../../shared/components/test_ids';
import { useTourContext } from '../../../../common/components/guided_onboarding_tour/tour';
import { casesPluginMock } from '@kbn/cases-plugin/public/mocks';

jest.mock('../../../../common/lib/kibana');
jest.mock('../../shared/hooks/use_is_timeline_flyout_open');
jest.mock('../../../../common/components/guided_onboarding_tour/tour');

const mockedUseKibana = mockUseKibana();

const { storage: storageMock } = createSecuritySolutionStorageMock();
const mockStore = createMockStore(undefined, undefined, undefined, {
  ...storageMock,
});
const mockCasesContract = casesPluginMock.createStartContract();
const mockUseIsAddToCaseOpen = mockCasesContract.hooks.useIsAddToCaseOpen as jest.Mock;
mockUseIsAddToCaseOpen.mockReturnValue(false);

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
        cases: mockCasesContract,
      },
    });
    (useIsTimelineFlyoutOpen as jest.Mock).mockReturnValue(false);
    (useTourContext as jest.Mock).mockReturnValue({ isTourShown: jest.fn(() => false) });
    storageMock.clear();
  });

  it('should render tour for alerts', async () => {
    const { getByText, getByTestId } = renderRightPanelTour();
    await waitFor(() => {
      expect(getByTestId(`${FLYOUT_TOUR_TEST_ID}-1`)).toBeVisible();
    });
    fireEvent.click(getByText('Next'));
    await waitFor(() => {
      expect(getByTestId(`${FLYOUT_TOUR_TEST_ID}-2`)).toBeVisible();
    });
    fireEvent.click(getByText('Next'));
    await waitFor(() => {
      expect(getByTestId(`${FLYOUT_TOUR_TEST_ID}-3`)).toBeVisible();
    });
    fireEvent.click(getByText('Next'));
  });

  it('should not render tour for preview', () => {
    const { queryByTestId, queryByText } = renderRightPanelTour({
      ...mockContextValue,
      isPreview: true,
    });
    expect(queryByTestId(`${FLYOUT_TOUR_TEST_ID}-1`)).not.toBeInTheDocument();
    expect(queryByText('Next')).not.toBeInTheDocument();
  });

  it('should not render tour when guided onboarding tour is active', () => {
    (useTourContext as jest.Mock).mockReturnValue({ isTourShown: jest.fn(() => true) });
    const { queryByText, queryByTestId } = renderRightPanelTour({
      ...mockContextValue,
      getFieldsData: () => '',
    });

    expect(queryByTestId(`${FLYOUT_TOUR_TEST_ID}-1`)).not.toBeInTheDocument();
    expect(queryByText('Next')).not.toBeInTheDocument();
  });

  it('should not render tour when case modal is open', () => {
    mockUseIsAddToCaseOpen.mockReturnValue(true);
    const { queryByText, queryByTestId } = renderRightPanelTour({
      ...mockContextValue,
      getFieldsData: () => '',
    });

    expect(queryByTestId(`${FLYOUT_TOUR_TEST_ID}-1`)).not.toBeInTheDocument();
    expect(queryByText('Next')).not.toBeInTheDocument();
  });

  it('should not render tour for flyout in timeline', () => {
    (useIsTimelineFlyoutOpen as jest.Mock).mockReturnValue(true);
    const { queryByText, queryByTestId } = renderRightPanelTour({
      ...mockContextValue,
      getFieldsData: () => '',
    });

    expect(queryByTestId(`${FLYOUT_TOUR_TEST_ID}-1`)).not.toBeInTheDocument();
    expect(queryByText('Next')).not.toBeInTheDocument();
  });
});
