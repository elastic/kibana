/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { renderReactTestingLibraryWithI18n as render } from '@kbn/test-jest-helpers';

import { PanelHeader } from './header';
import { allThreeTabs } from './hooks/use_tabs';
import { GuidedOnboardingTourStep } from '../../../common/components/guided_onboarding_tour/tour_step';
import { useBasicDataFromDetailsData } from '../../../timelines/components/side_panel/event_details/helpers';

jest.mock('./context', () => ({
  useRightPanelContext: jest.fn().mockReturnValue({ dataFormattedForFieldBrowser: [] }),
}));
jest.mock('../../../timelines/components/side_panel/event_details/helpers', () => ({
  useBasicDataFromDetailsData: jest.fn(),
}));
jest.mock('../../../common/components/guided_onboarding_tour/tour_step', () => ({
  GuidedOnboardingTourStep: jest.fn().mockReturnValue(<div />),
}));

jest.mock('./components/alert_header_title', () => ({
  AlertHeaderTitle: jest.fn().mockReturnValue(<div data-test-subj="alert-header" />),
}));

jest.mock('./components/event_header_title', () => ({
  EventHeaderTitle: jest.fn().mockReturnValue(<div data-test-subj="event-header" />),
}));

const mockUseBasicDataFromDetailsData = useBasicDataFromDetailsData as jest.Mock;
const mockGuidedOnboardingTourStep = GuidedOnboardingTourStep as unknown as jest.Mock;

describe('PanelHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render tab name', () => {
    mockUseBasicDataFromDetailsData.mockReturnValue({ isAlert: false });
    const { getByText } = render(
      <PanelHeader selectedTabId={'overview'} setSelectedTabId={jest.fn()} tabs={allThreeTabs} />
    );
    expect(GuidedOnboardingTourStep).not.toBeCalled();
    expect(getByText('Overview')).toBeInTheDocument();
  });

  it('should render event header title when isAlert equals false', () => {
    mockUseBasicDataFromDetailsData.mockReturnValue({ isAlert: false });
    const { queryByTestId } = render(
      <PanelHeader selectedTabId={'overview'} setSelectedTabId={jest.fn()} tabs={allThreeTabs} />
    );
    expect(queryByTestId('alert-header')).not.toBeInTheDocument();
    expect(queryByTestId('event-header')).toBeInTheDocument();
  });

  it('should render alert header title when isAlert equals true', () => {
    mockUseBasicDataFromDetailsData.mockReturnValue({ isAlert: true });
    const { queryByTestId } = render(
      <PanelHeader selectedTabId={'overview'} setSelectedTabId={jest.fn()} tabs={allThreeTabs} />
    );
    expect(queryByTestId('alert-header')).toBeInTheDocument();
    expect(queryByTestId('event-header')).not.toBeInTheDocument();
  });

  it('should render tab name with guided onboarding tour info', () => {
    mockUseBasicDataFromDetailsData.mockReturnValue({ isAlert: true });
    render(
      <PanelHeader selectedTabId={'overview'} setSelectedTabId={jest.fn()} tabs={allThreeTabs} />
    );
    expect(mockGuidedOnboardingTourStep.mock.calls[0][0].isTourAnchor).toBe(true);
    expect(mockGuidedOnboardingTourStep.mock.calls[0][0].step).toBe(3);
    expect(mockGuidedOnboardingTourStep.mock.calls[0][0].tourId).toBe('alertsCases');
  });
});
