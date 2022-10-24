/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { GuidedOnboardingTourStep } from './tour_step';
import { getTourAnchor, SecurityStepId } from './tour_config';

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
