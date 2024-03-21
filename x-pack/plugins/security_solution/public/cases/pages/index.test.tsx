/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Cases } from '.';
import { Router } from '@kbn/shared-ux-router';
import { render } from '@testing-library/react';
import { TestProviders } from '../../common/mock';
import { useTourContext } from '../../common/components/guided_onboarding_tour';
import {
  AlertsCasesTourSteps,
  SecurityStepId,
} from '../../common/components/guided_onboarding_tour/tour_config';

jest.mock('../../common/components/guided_onboarding_tour');
jest.mock('../../common/lib/kibana');

type Action = 'PUSH' | 'POP' | 'REPLACE';
const pop: Action = 'POP';
const location = {
  pathname: '/network',
  search: '',
  state: '',
  hash: '',
};
const mockHistory = {
  length: 2,
  location,
  action: pop,
  push: jest.fn(),
  replace: jest.fn(),
  go: jest.fn(),
  goBack: jest.fn(),
  goForward: jest.fn(),
  block: jest.fn(),
  createHref: jest.fn(),
  listen: jest.fn(),
};

describe('cases page in security', () => {
  const endTourStep = jest.fn();
  beforeEach(() => {
    (useTourContext as jest.Mock).mockReturnValue({
      activeStep: AlertsCasesTourSteps.viewCase,
      incrementStep: () => null,
      endTourStep,
      isTourShown: () => true,
    });
    jest.clearAllMocks();
  });

  it('calls endTour on cases details page when SecurityStepId.alertsCases tour is active and step is AlertsCasesTourSteps.viewCase', () => {
    render(
      <Router history={mockHistory}>
        <Cases />
      </Router>,
      { wrapper: TestProviders }
    );

    expect(endTourStep).toHaveBeenCalledWith(SecurityStepId.alertsCases);
  });

  it('does not call endTour on cases details page when SecurityStepId.alertsCases tour is not active', () => {
    (useTourContext as jest.Mock).mockReturnValue({
      activeStep: AlertsCasesTourSteps.viewCase,
      incrementStep: () => null,
      endTourStep,
      isTourShown: () => false,
    });
    render(
      <Router history={mockHistory}>
        <Cases />
      </Router>,
      { wrapper: TestProviders }
    );

    expect(endTourStep).not.toHaveBeenCalled();
  });

  it('does not call endTour on cases details page when SecurityStepId.alertsCases tour is active and step is not AlertsCasesTourSteps.viewCase', () => {
    (useTourContext as jest.Mock).mockReturnValue({
      activeStep: AlertsCasesTourSteps.expandEvent,
      incrementStep: () => null,
      endTourStep,
      isTourShown: () => true,
    });

    render(
      <Router history={mockHistory}>
        <Cases />
      </Router>,
      { wrapper: TestProviders }
    );

    expect(endTourStep).not.toHaveBeenCalled();
  });
});
