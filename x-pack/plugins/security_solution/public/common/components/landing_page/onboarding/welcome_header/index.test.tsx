/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { WelcomeHeader } from '.';
import { useCurrentUser } from '../../../../lib/kibana';
import { CurrentPlan } from './current_plan';
import { ProductTier } from '../configs';
import { useProjectFeaturesUrl } from '../hooks/use_project_features_url';

jest.mock('../../../../lib/kibana', () => ({
  useCurrentUser: jest.fn(),
}));

jest.mock('../hooks/use_project_features_url', () => ({
  useProjectFeaturesUrl: jest.fn(),
}));

jest.mock('./current_plan', () => ({
  CurrentPlan: jest.fn().mockReturnValue(<div data-test-subj="current-plan" />),
}));

const mockUseCurrentUser = useCurrentUser as jest.Mock;
const mockCurrentPlan = CurrentPlan as unknown as jest.Mock;
const mockUseProjectFeaturesUrl = useProjectFeaturesUrl as jest.Mock;
const mockProjectFeaturesUrl = '/features';

describe('WelcomeHeaderComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render fullName when fullName is provided', () => {
    const fullName = 'John Doe';
    mockUseCurrentUser.mockReturnValue({ fullName });
    const { getByText } = render(<WelcomeHeader />);
    const titleElement = getByText(`Hi ${fullName}!`);
    expect(titleElement).toBeInTheDocument();
  });

  it('should render username when fullName is an empty string', () => {
    const fullName = '';
    const username = 'jd';
    mockUseCurrentUser.mockReturnValue({ fullName, username });

    const { getByText } = render(<WelcomeHeader />);
    const titleElement = getByText(`Hi ${username}!`);
    expect(titleElement).toBeInTheDocument();
  });

  it('should render username when fullName is not provided', () => {
    const username = 'jd';
    mockUseCurrentUser.mockReturnValue({ username });

    const { getByText } = render(<WelcomeHeader />);
    const titleElement = getByText(`Hi ${username}!`);
    expect(titleElement).toBeInTheDocument();
  });

  it('should not render the greeting message if both fullName and username are not available', () => {
    mockUseCurrentUser.mockReturnValue({});

    const { queryByTestId } = render(<WelcomeHeader />);
    const greetings = queryByTestId(`welcome-header-greetings`);
    expect(greetings).not.toBeInTheDocument();
  });

  it('should render subtitle', () => {
    const { getByText } = render(<WelcomeHeader />);
    const subtitleElement = getByText('Get started with Security');
    expect(subtitleElement).toBeInTheDocument();
  });

  it('should render description', () => {
    const { getByText } = render(<WelcomeHeader />);
    const descriptionElement = getByText(
      'This area shows you everything you need to know. Feel free to explore all content. You can always come back here at any time.'
    );
    expect(descriptionElement).toBeInTheDocument();
  });

  it('should render current plan', () => {
    mockUseProjectFeaturesUrl.mockReturnValue(mockProjectFeaturesUrl);
    const { getByTestId } = render(<WelcomeHeader productTier={ProductTier.complete} />);
    const currentPlanElement = getByTestId('current-plan');
    expect(currentPlanElement).toBeInTheDocument();
    expect(mockCurrentPlan.mock.calls[0][0]).toEqual({
      productTier: 'complete',
      projectFeaturesUrl: mockProjectFeaturesUrl,
    });
  });
});
