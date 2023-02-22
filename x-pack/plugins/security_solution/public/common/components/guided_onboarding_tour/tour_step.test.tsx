/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import type { EuiTourStepProps } from '@elastic/eui';
import { GuidedOnboardingTourStep, SecurityTourStep } from './tour_step';
import { AlertsCasesTourSteps, SecurityStepId } from './tour_config';
import { useTourContext } from './tour';
import { mockGlobalState, SUB_PLUGINS_REDUCER, TestProviders } from '../../mock';
import { TimelineId } from '../../../../common/types';
import { createStore } from '../../store';
import { kibanaObservable } from '@kbn/timelines-plugin/public/mock';
import { createSecuritySolutionStorageMock } from '@kbn/timelines-plugin/public/mock/mock_local_storage';

jest.mock('./tour');
const mockTourStep = jest
  .fn()
  .mockImplementation(({ children, footerAction }: EuiTourStepProps) => (
    <span data-test-subj="tourStepMock">
      {children} {footerAction}
    </span>
  ));
jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    EuiTourStep: (props: any) => mockTourStep(props),
  };
});
const defaultProps = {
  isTourAnchor: true,
  step: 1,
  tourId: SecurityStepId.alertsCases,
};

const mockChildren = <h1 data-test-subj="h1">{'random child element'}</h1>;

describe('GuidedOnboardingTourStep', () => {
  const incrementStep = jest.fn();
  beforeEach(() => {
    (useTourContext as jest.Mock).mockReturnValue({
      activeStep: 1,
      incrementStep,
      isTourShown: () => true,
    });
    jest.clearAllMocks();
  });
  it('renders as a tour step', () => {
    const { getByTestId } = render(
      <GuidedOnboardingTourStep {...defaultProps}>{mockChildren}</GuidedOnboardingTourStep>,
      { wrapper: TestProviders }
    );
    const tourStep = getByTestId('tourStepMock');
    const header = getByTestId('h1');
    expect(tourStep).toBeInTheDocument();
    expect(header).toBeInTheDocument();
  });
  it('isTourAnchor={false}, just render children', () => {
    const { getByTestId, queryByTestId } = render(
      <GuidedOnboardingTourStep {...defaultProps} isTourAnchor={false}>
        {mockChildren}
      </GuidedOnboardingTourStep>,
      { wrapper: TestProviders }
    );
    const tourStep = queryByTestId('tourStepMock');
    const header = getByTestId('h1');
    expect(tourStep).not.toBeInTheDocument();
    expect(header).toBeInTheDocument();
  });
  it('onClick={undefined}, call incrementStep on click', () => {
    const { getByTestId } = render(
      <GuidedOnboardingTourStep {...defaultProps}>{mockChildren}</GuidedOnboardingTourStep>,
      { wrapper: TestProviders }
    );
    const nextButton = getByTestId('onboarding--securityTourNextStepButton');
    act(() => {
      fireEvent.click(nextButton);
    });
    expect(incrementStep).toHaveBeenCalled();
  });
  it('onClick={any function}, do not call incrementStep on click', () => {
    const onClick = jest.fn();
    const { getByTestId } = render(
      <GuidedOnboardingTourStep {...defaultProps} onClick={onClick}>
        {mockChildren}
      </GuidedOnboardingTourStep>,
      { wrapper: TestProviders }
    );
    const nextButton = getByTestId('onboarding--securityTourNextStepButton');
    act(() => {
      fireEvent.click(nextButton);
    });
    expect(onClick).toHaveBeenCalled();
    expect(incrementStep).not.toHaveBeenCalled();
  });
});

describe('SecurityTourStep', () => {
  const { isTourAnchor: _, ...stepDefaultProps } = defaultProps;
  beforeEach(() => {
    (useTourContext as jest.Mock).mockReturnValue({
      activeStep: 1,
      incrementStep: jest.fn(),
      isTourShown: () => true,
    });
    jest.clearAllMocks();
  });

  it('does not render if tour step does not exist', () => {
    (useTourContext as jest.Mock).mockReturnValue({
      activeStep: 99,
      incrementStep: jest.fn(),
      isTourShown: () => true,
    });
    render(
      <SecurityTourStep {...stepDefaultProps} step={99}>
        {mockChildren}
      </SecurityTourStep>,
      { wrapper: TestProviders }
    );
    expect(mockTourStep).not.toHaveBeenCalled();
  });

  it('does not render if tour step does not equal active step', () => {
    render(
      <SecurityTourStep {...stepDefaultProps} step={AlertsCasesTourSteps.addAlertToCase}>
        {mockChildren}
      </SecurityTourStep>,
      { wrapper: TestProviders }
    );
    expect(mockTourStep).not.toHaveBeenCalled();
  });

  it('does not render if security tour step is not shown', () => {
    (useTourContext as jest.Mock).mockReturnValue({
      activeStep: 1,
      incrementStep: jest.fn(),
      isTourShown: () => false,
    });
    render(<SecurityTourStep {...stepDefaultProps}>{mockChildren}</SecurityTourStep>, {
      wrapper: TestProviders,
    });
    expect(mockTourStep).not.toHaveBeenCalled();
  });

  it('renders tour step with correct number of steppers', () => {
    render(<SecurityTourStep {...stepDefaultProps}>{mockChildren}</SecurityTourStep>, {
      wrapper: TestProviders,
    });
    const mockCall = { ...mockTourStep.mock.calls[0][0] };
    expect(mockCall.step).toEqual(1);
    expect(mockCall.stepsTotal).toEqual(7);
  });

  it('forces the render for createCase step of the SecurityStepId.alertsCases tour step', () => {
    render(
      <SecurityTourStep {...stepDefaultProps} step={AlertsCasesTourSteps.createCase}>
        {mockChildren}
      </SecurityTourStep>,
      { wrapper: TestProviders }
    );
    const mockCall = { ...mockTourStep.mock.calls[0][0] };
    expect(mockCall.step).toEqual(5);
  });

  it('renders next button', () => {
    (useTourContext as jest.Mock).mockReturnValue({
      activeStep: 3,
      incrementStep: jest.fn(),
      isTourShown: () => true,
    });
    const { getByTestId } = render(
      <SecurityTourStep {...stepDefaultProps} step={AlertsCasesTourSteps.reviewAlertDetailsFlyout}>
        {mockChildren}
      </SecurityTourStep>,
      { wrapper: TestProviders }
    );
    expect(getByTestId('onboarding--securityTourNextStepButton')).toBeInTheDocument();
  });

  it('if a step has an anchor declared, the tour step should be a sibling of the mockChildren', () => {
    (useTourContext as jest.Mock).mockReturnValue({
      activeStep: 3,
      incrementStep: jest.fn(),
      isTourShown: () => true,
    });
    const { container } = render(
      <SecurityTourStep {...stepDefaultProps} step={AlertsCasesTourSteps.reviewAlertDetailsFlyout}>
        {mockChildren}
      </SecurityTourStep>,
      { wrapper: TestProviders }
    );
    const selectParent = container.querySelector(
      `[data-test-subj="tourStepMock"] [data-test-subj="h1"]`
    );
    const selectSibling = container.querySelector(
      `[data-test-subj="tourStepMock"]+[data-test-subj="h1"]`
    );
    expect(selectSibling).toBeInTheDocument();
    expect(selectParent).not.toBeInTheDocument();
  });

  it('if a step does not an anchor declared, the tour step should be the parent of the mockChildren', () => {
    (useTourContext as jest.Mock).mockReturnValue({
      activeStep: 2,
      incrementStep: jest.fn(),
      isTourShown: () => true,
    });
    const { container } = render(
      <SecurityTourStep {...stepDefaultProps} step={AlertsCasesTourSteps.expandEvent}>
        {mockChildren}
      </SecurityTourStep>,
      { wrapper: TestProviders }
    );
    const selectParent = container.querySelector(
      `[data-test-subj="tourStepMock"] [data-test-subj="h1"]`
    );
    const selectSibling = container.querySelector(
      `[data-test-subj="tourStepMock"]+[data-test-subj="h1"]`
    );
    expect(selectParent).toBeInTheDocument();
    expect(selectSibling).not.toBeInTheDocument();
  });

  it('if a tour step does not have children and has anchor, only render tour step', () => {
    const { getByTestId } = render(
      <SecurityTourStep {...stepDefaultProps} step={AlertsCasesTourSteps.createCase} />,
      { wrapper: TestProviders }
    );
    expect(getByTestId('tourStepMock')).toBeInTheDocument();
  });

  it('if a tour step does not have children and does not have anchor, render nothing', () => {
    const { queryByTestId } = render(
      <SecurityTourStep {...stepDefaultProps} step={AlertsCasesTourSteps.pointToAlertName} />,
      { wrapper: TestProviders }
    );
    expect(queryByTestId('tourStepMock')).not.toBeInTheDocument();
  });

  it('does not render step if timeline is open', () => {
    const mockstate = {
      ...mockGlobalState,
      timeline: {
        ...mockGlobalState.timeline,
        timelineById: {
          [TimelineId.active]: {
            ...mockGlobalState.timeline.timelineById.test,
            show: true,
          },
        },
      },
    };
    const { storage } = createSecuritySolutionStorageMock();
    const mockStore = createStore(mockstate, SUB_PLUGINS_REDUCER, kibanaObservable, storage);

    render(
      <TestProviders store={mockStore}>
        <SecurityTourStep {...stepDefaultProps}>{mockChildren}</SecurityTourStep>
      </TestProviders>
    );
    expect(mockTourStep).not.toHaveBeenCalled();
  });

  it('does not render next button if step hideNextButton=true ', () => {
    (useTourContext as jest.Mock).mockReturnValue({
      activeStep: 6,
      incrementStep: jest.fn(),
      isTourShown: () => true,
    });
    const { queryByTestId } = render(
      <SecurityTourStep {...stepDefaultProps} step={6}>
        {mockChildren}
      </SecurityTourStep>,
      { wrapper: TestProviders }
    );

    expect(queryByTestId('onboarding--securityTourNextStepButton')).not.toBeInTheDocument();
  });
});
