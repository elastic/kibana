/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import { GuidedOnboardingTourStep, SecurityTourStep } from './tour_step';
import { SecurityStepId } from './tour_config';
import { useTourContext } from './tour';
import { mockGlobalState, SUB_PLUGINS_REDUCER, TestProviders } from '../../mock';
import { TimelineId } from '../../../../common/types';
import { createStore } from '../../store';
import { tGridReducer } from '@kbn/timelines-plugin/public';
import { kibanaObservable } from '@kbn/timelines-plugin/public/mock';
import { createSecuritySolutionStorageMock } from '@kbn/timelines-plugin/public/mock/mock_local_storage';

jest.mock('./tour');
const mockTourStep = jest
  .fn()
  .mockImplementation(({ children, footerAction }: { children: React.ReactNode }) => (
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
  stepId: SecurityStepId.alertsCases,
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
  const { isTourAnchor: _, ...securityTourStepDefaultProps } = defaultProps;
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
      <SecurityTourStep {...securityTourStepDefaultProps} step={99}>
        {mockChildren}
      </SecurityTourStep>,
      { wrapper: TestProviders }
    );
    expect(mockTourStep).not.toHaveBeenCalled();
  });

  it('does not render if tour step does not equal active step', () => {
    render(
      <SecurityTourStep {...securityTourStepDefaultProps} step={4}>
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
    render(<SecurityTourStep {...securityTourStepDefaultProps}>{mockChildren}</SecurityTourStep>, {
      wrapper: TestProviders,
    });
    expect(mockTourStep).not.toHaveBeenCalled();
  });

  it('renders tour step with correct number of steppers', () => {
    render(<SecurityTourStep {...securityTourStepDefaultProps}>{mockChildren}</SecurityTourStep>, {
      wrapper: TestProviders,
    });
    const mockCall = { ...mockTourStep.mock.calls[0][0] };
    expect(mockCall.step).toEqual(1);
    expect(mockCall.stepsTotal).toEqual(5);
  });

  it('forces the render for step 5 of the SecurityStepId.alertsCases tour step', () => {
    render(
      <SecurityTourStep {...securityTourStepDefaultProps} step={5}>
        {mockChildren}
      </SecurityTourStep>,
      { wrapper: TestProviders }
    );
    const mockCall = { ...mockTourStep.mock.calls[0][0] };
    expect(mockCall.step).toEqual(5);
    expect(mockCall.stepsTotal).toEqual(5);
  });

  it('does render next button if step hideNextButton=false ', () => {
    (useTourContext as jest.Mock).mockReturnValue({
      activeStep: 3,
      incrementStep: jest.fn(),
      isTourShown: () => true,
    });
    render(
      <SecurityTourStep {...securityTourStepDefaultProps} step={3}>
        {mockChildren}
      </SecurityTourStep>,
      { wrapper: TestProviders }
    );
    const mockCall = { ...mockTourStep.mock.calls[0][0] };
    expect(mockCall.footerAction).toMatchInlineSnapshot(`
     <EuiButton
       color="success"
       data-test-subj="onboarding--securityTourNextStepButton"
       onClick={[Function]}
       size="s"
       tour-step="nextButton"
     >
       <FormattedMessage
         defaultMessage="Next"
         id="xpack.securitySolution.guided_onboarding.nextStep.buttonLabel"
         values={Object {}}
       />
     </EuiButton>
    `);
  });

  it('if a step has an anchor declared, the tour step should be a sibling of the mockChildren', () => {
    (useTourContext as jest.Mock).mockReturnValue({
      activeStep: 3,
      incrementStep: jest.fn(),
      isTourShown: () => true,
    });
    const { container } = render(
      <SecurityTourStep {...securityTourStepDefaultProps} step={3}>
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
      <SecurityTourStep {...securityTourStepDefaultProps} step={2}>
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
      <SecurityTourStep {...securityTourStepDefaultProps} step={5} />,
      { wrapper: TestProviders }
    );
    expect(getByTestId('tourStepMock')).toBeInTheDocument();
  });

  it('if a tour step does not have children and does not have anchor, render nothing', () => {
    const { queryByTestId } = render(
      <SecurityTourStep {...securityTourStepDefaultProps} step={1} />,
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
    const mockStore = createStore(
      mockstate,
      SUB_PLUGINS_REDUCER,
      { dataTable: tGridReducer },
      kibanaObservable,
      storage
    );

    render(
      <TestProviders store={mockStore}>
        <SecurityTourStep {...securityTourStepDefaultProps}>{mockChildren}</SecurityTourStep>
      </TestProviders>
    );
    expect(mockTourStep).not.toHaveBeenCalled();
  });
});
