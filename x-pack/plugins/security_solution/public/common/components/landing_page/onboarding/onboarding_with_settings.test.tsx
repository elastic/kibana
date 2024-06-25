/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { OnboardingWithSettings } from './onboarding_with_settings';
import { useAvailableSteps } from './hooks/use_available_steps';
import { useSpaceId } from '../../../hooks/use_space_id';

const useAvailableStepsMock = useAvailableSteps as jest.Mock;
const useSpaceIdMock = useSpaceId as jest.Mock;

jest.mock('./onboarding');
jest.mock('../../../hooks/use_space_id', () => ({
  useSpaceId: jest.fn().mockReturnValue('mockSpaceId'),
}));

jest.mock('./hooks/use_available_steps', () => ({
  useAvailableSteps: jest.fn().mockReturnValue([]),
}));

jest.mock('./hooks/use_product_types');

describe('OnboardingWithSettings', () => {
  it('should render Onboarding component', () => {
    const { getByTestId } = render(<OnboardingWithSettings />);
    expect(getByTestId('onboarding')).toBeInTheDocument();
  });

  it('should not render Onboarding component when onboardingSteps is null', () => {
    useAvailableStepsMock.mockReturnValue(null);
    const { queryByTestId } = render(<OnboardingWithSettings />);
    expect(queryByTestId('onboarding')).toBeNull();
  });
  it('should not render Onboarding component when spaceId is null', () => {
    useSpaceIdMock.mockReturnValue(undefined);
    const { queryByTestId } = render(<OnboardingWithSettings />);
    expect(queryByTestId('onboarding')).toBeNull();
  });
});
