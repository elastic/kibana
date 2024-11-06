/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react';
import { LeftPanelTour } from './tour';
import { DocumentDetailsContext } from '../../shared/context';
import { mockContextValue } from '../../shared/mocks/mock_context';
import {
  createMockStore,
  createSecuritySolutionStorageMock,
  TestProviders,
} from '../../../../common/mock';
import { useKibana as mockUseKibana } from '../../../../common/lib/kibana/__mocks__';
import { useKibana } from '../../../../common/lib/kibana';
import { FLYOUT_TOUR_CONFIG_ANCHORS } from '../../shared/utils/tour_step_config';
import { FLYOUT_TOUR_TEST_ID } from '../../shared/components/test_ids';
import { useWhichFlyout } from '../../shared/hooks/use_which_flyout';
import { Flyouts } from '../../shared/constants/flyouts';

jest.mock('../../../../common/lib/kibana');
jest.mock('../../shared/hooks/use_which_flyout');

const mockedUseKibana = mockUseKibana();

const { storage: storageMock } = createSecuritySolutionStorageMock();
const mockStore = createMockStore(undefined, undefined, undefined, {
  ...storageMock,
});

const renderLeftPanelTour = (context: DocumentDetailsContext = mockContextValue) =>
  render(
    <TestProviders store={mockStore}>
      <DocumentDetailsContext.Provider value={context}>
        <LeftPanelTour />
        {Object.values(FLYOUT_TOUR_CONFIG_ANCHORS).map((i, idx) => (
          <div key={idx} data-test-subj={i} />
        ))}
      </DocumentDetailsContext.Provider>
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
    (useWhichFlyout as jest.Mock).mockReturnValue(Flyouts.securitySolution);

    storageMock.clear();
  });

  it('should render left panel tour for alerts starting as step 4', async () => {
    storageMock.set('securitySolution.documentDetails.newFeaturesTour.v8.14', {
      currentTourStep: 4,
      isTourActive: true,
    });

    const { getByText, getByTestId } = renderLeftPanelTour();
    await waitFor(() => {
      expect(getByTestId(`${FLYOUT_TOUR_TEST_ID}-4`)).toBeVisible();
    });
    fireEvent.click(getByText('Next'));
    await waitFor(() => {
      expect(getByTestId(`${FLYOUT_TOUR_TEST_ID}-5`)).toBeVisible();
    });
    await waitFor(() => {
      expect(getByText('Finish')).toBeVisible();
    });
  });

  it('should not render left panel tour for preview', () => {
    storageMock.set('securitySolution.documentDetails.newFeaturesTour.v8.14', {
      currentTourStep: 3,
      isTourActive: true,
    });

    const { queryByTestId, queryByText } = renderLeftPanelTour({
      ...mockContextValue,
      isPreview: true,
    });
    expect(queryByTestId(`${FLYOUT_TOUR_TEST_ID}-4`)).not.toBeInTheDocument();
    expect(queryByText('Next')).not.toBeInTheDocument();
  });

  it('should not render left panel tour for non-alerts', async () => {
    storageMock.set('securitySolution.documentDetails.newFeaturesTour.v8.14', {
      currentTourStep: 3,
      isTourActive: true,
    });

    const { queryByTestId, queryByText } = renderLeftPanelTour({
      ...mockContextValue,
      getFieldsData: () => '',
    });
    expect(queryByTestId(`${FLYOUT_TOUR_TEST_ID}-4`)).not.toBeInTheDocument();
    expect(queryByText('Next')).not.toBeInTheDocument();
  });

  it('should not render left panel tour for flyout in timeline', () => {
    (useWhichFlyout as jest.Mock).mockReturnValue(Flyouts.timeline);
    storageMock.set('securitySolution.documentDetails.newFeaturesTour.v8.14', {
      currentTourStep: 3,
      isTourActive: true,
    });

    const { queryByTestId, queryByText } = renderLeftPanelTour({
      ...mockContextValue,
      isPreview: true,
    });
    expect(queryByTestId(`${FLYOUT_TOUR_TEST_ID}-4`)).not.toBeInTheDocument();
    expect(queryByText('Next')).not.toBeInTheDocument();
  });
});
