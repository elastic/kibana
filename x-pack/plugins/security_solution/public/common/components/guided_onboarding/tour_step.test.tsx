/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { GuidedOnboardingTourStep, SecurityTourStep } from './tour_step';
import { getTourAnchor, SecurityStepId } from './tour_config';
import { useTourContext } from './tour';

jest.mock('./tour');
const mockTourStep = jest.fn().mockReturnValue(<span />);
jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    EuiTourStep: (props: any) => mockTourStep(props),
  };
});
const defaultProps = {
  isTourAnchor: true,
  step: 1,
  stepId: SecurityStepId.alertsCases,
};

const children = <h1 data-test-subj="h1">{'random child element'}</h1>;

const defaultTourStep = getTourAnchor(defaultProps.step, defaultProps.stepId);
describe('GuidedOnboardingTourStep', () => {
  it('renders the tour anchor', () => {
    const { container, getByTestId } = render(
      <GuidedOnboardingTourStep {...defaultProps}>{children}</GuidedOnboardingTourStep>
    );
    const tourAnchor = container.querySelector(`[tour-step="${defaultTourStep}"]`);
    const header = getByTestId('h1');
    expect(tourAnchor).toBeInTheDocument();
    expect(header).toBeInTheDocument();
  });
  it('if is not tour anchor, just return children', () => {
    const { container, getByTestId } = render(
      <GuidedOnboardingTourStep {...defaultProps} isTourAnchor={false}>
        {children}
      </GuidedOnboardingTourStep>
    );
    const tourAnchor = container.querySelector(`[tour-step="${defaultTourStep}"]`);
    const header = getByTestId('h1');
    expect(tourAnchor).not.toBeInTheDocument();
    expect(header).toBeInTheDocument();
  });
  it('if altAnchor is true, tourStep label should be empty', () => {
    const { container } = render(
      <GuidedOnboardingTourStep {...defaultProps} altAnchor>
        {children}
      </GuidedOnboardingTourStep>
    );
    const tourAnchor = container.querySelector(`[tour-step="${defaultTourStep}"]`);
    const altAnchor = container.querySelector(`[tour-step=""]`);
    expect(tourAnchor).not.toBeInTheDocument();
    expect(altAnchor).toBeInTheDocument();
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
  it('renders tour step with correct number of steppers', () => {
    render(<SecurityTourStep {...securityTourStepDefaultProps} />);
    const mockCall = { ...mockTourStep.mock.calls[0][0] };
    expect(mockCall.step).toEqual(1);
    expect(mockCall.stepsTotal).toEqual(5);
  });
  it('does not render if tour step does not exist', () => {
    (useTourContext as jest.Mock).mockReturnValue({
      activeStep: 99,
      incrementStep: jest.fn(),
      isTourShown: () => true,
    });
    render(<SecurityTourStep {...securityTourStepDefaultProps} step={99} />);
    expect(mockTourStep).not.toHaveBeenCalled();
  });
  it('does not render if tour step does not equal active step', () => {
    render(<SecurityTourStep {...securityTourStepDefaultProps} step={4} />);
    expect(mockTourStep).not.toHaveBeenCalled();
  });
  it('does not render if security tour step is not shown', () => {
    (useTourContext as jest.Mock).mockReturnValue({
      activeStep: 1,
      incrementStep: jest.fn(),
      isTourShown: () => false,
    });
    render(<SecurityTourStep {...securityTourStepDefaultProps} />);
    expect(mockTourStep).not.toHaveBeenCalled();
  });
  it('forces the render for step 5 of the SecurityStepId.alertsCases tour step', () => {
    render(<SecurityTourStep {...securityTourStepDefaultProps} step={5} />);
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
    render(<SecurityTourStep {...securityTourStepDefaultProps} step={3} />);
    const mockCall = { ...mockTourStep.mock.calls[0][0] };
    expect(mockCall.footerAction).toMatchInlineSnapshot(`
     <EuiButton
       color="success"
       data-test-subj="onboarding--securityTourNextStepButton"
       onClick={[Function]}
       size="s"
     >
       <FormattedMessage
         defaultMessage="Next"
         id="xpack.securitySolution.guided_onboarding.nextStep.buttonLabel"
         values={Object {}}
       />
     </EuiButton>
    `);
  });
  it('does not render next button if step hideNextButton=true ', () => {
    (useTourContext as jest.Mock).mockReturnValue({
      activeStep: 4,
      incrementStep: jest.fn(),
      isTourShown: () => true,
    });
    render(<SecurityTourStep {...securityTourStepDefaultProps} step={4} />);
    const mockCall = { ...mockTourStep.mock.calls[0][0] };
    expect(mockCall.footerAction).toMatchInlineSnapshot(`<React.Fragment />`);
  });
});
