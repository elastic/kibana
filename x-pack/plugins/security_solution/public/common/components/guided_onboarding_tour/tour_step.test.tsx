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
import { mockGlobalState, TestProviders, createMockStore } from '../../mock';
import { TimelineId } from '../../../../common/types';
import { casesPluginMock } from '@kbn/cases-plugin/public/mocks';
import { useKibana as mockUseKibana } from '../../lib/kibana/__mocks__';
import { useHiddenByFlyout } from './use_hidden_by_flyout';

const mockedUseKibana = mockUseKibana();
const mockCasesContract = casesPluginMock.createStartContract();
const mockUseIsAddToCaseOpen = mockCasesContract.hooks.useIsAddToCaseOpen as jest.Mock;
mockUseIsAddToCaseOpen.mockReturnValue(false);
const mockUseTourContext = useTourContext as jest.Mock;

jest.mock('../../lib/kibana', () => {
  const original = jest.requireActual('../../lib/kibana');
  return {
    ...original,
    useToasts: jest.fn().mockReturnValue({ addWarning: jest.fn() }),
    useKibana: () => ({
      ...mockedUseKibana,
      services: {
        ...mockedUseKibana.services,
        cases: mockCasesContract,
      },
    }),
  };
});

jest.mock('./tour');

const useHiddenByFlyoutMock = useHiddenByFlyout as jest.Mock;
jest.mock('./use_hidden_by_flyout', () => ({
  useHiddenByFlyout: jest.fn(),
}));

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    EuiTourStep: (props: any) => mockTourStep(props),
  };
});

const mockTourStep = jest
  .fn()
  .mockImplementation(({ children, footerAction }: EuiTourStepProps) => (
    <span data-test-subj="tourStepMock">
      {children} {footerAction}
    </span>
  ));

const defaultProps = {
  isTourAnchor: true,
  step: AlertsCasesTourSteps.pointToAlertName,
  tourId: SecurityStepId.alertsCases,
};

const mockChildren = <h1 data-test-subj="h1">{'random child element'}</h1>;
const incrementStep = jest.fn();

const defaultUseTourContextValue = {
  activeStep: AlertsCasesTourSteps.pointToAlertName,
  incrementStep,
  endTourStep: jest.fn(),
  isTourShown: jest.fn(() => true),
  hidden: false,
};

describe('GuidedOnboardingTourStep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTourContext.mockReturnValue(defaultUseTourContextValue);
    useHiddenByFlyoutMock.mockReturnValue(false);
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
  it('useHiddenByFlyout equals to true, just render children', () => {
    useHiddenByFlyoutMock.mockReturnValue(true);
    const { getByTestId, queryByTestId } = render(
      <GuidedOnboardingTourStep {...defaultProps}>{mockChildren}</GuidedOnboardingTourStep>,
      { wrapper: TestProviders }
    );
    const tourStep = queryByTestId('tourStepMock');
    const header = getByTestId('h1');
    expect(tourStep).not.toBeInTheDocument();
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
    (useTourContext as jest.Mock).mockReturnValue(defaultUseTourContextValue);
    jest.clearAllMocks();
  });

  it('does not render if tour step does not exist', () => {
    mockUseTourContext.mockReturnValue({
      ...defaultUseTourContextValue,
      activeStep: 99,
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
    mockUseTourContext.mockReturnValue({
      ...defaultUseTourContextValue,
      activeStep: 1,
      isTourShown: jest.fn(() => false),
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
    mockUseTourContext.mockReturnValue({
      ...defaultUseTourContextValue,
      activeStep: 3,
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
      ...defaultUseTourContextValue,
      activeStep: 3,
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
    mockUseTourContext.mockReturnValue({
      ...defaultUseTourContextValue,
      activeStep: 2,
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
    const mockStore = createMockStore(mockstate);

    render(
      <TestProviders store={mockStore}>
        <SecurityTourStep {...stepDefaultProps}>{mockChildren}</SecurityTourStep>
      </TestProviders>
    );
    expect(mockTourStep).not.toHaveBeenCalled();
  });

  it('does not render next button if step hideNextButton=true ', () => {
    (useTourContext as jest.Mock).mockReturnValue({
      ...defaultUseTourContextValue,
      activeStep: 6,
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
