/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { GetStartedComponent } from './get_started';

jest.mock('./toggle_panel');
jest.mock('./welcome_panel');
jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    useEuiTheme: jest.fn().mockReturnValue({
      euiTheme: { base: 16, size: { xs: '4px' } },
    }),
  };
});

describe('GetStartedComponent', () => {
  it('should render page title, subtitle, and description', () => {
    const { getByText } = render(<GetStartedComponent />);

    const pageTitle = getByText('Welcome');
    const subtitle = getByText('Let’s get started');
    const description = getByText(
      `Set up your Elastic Security workspace. Use the toggles below to curate a list of tasks that best fits your environment`
    );

    expect(pageTitle).toBeInTheDocument();
    expect(subtitle).toBeInTheDocument();
    expect(description).toBeInTheDocument();
  });

  it('should render WelcomePanel and TogglePanel', () => {
    const { getByTestId } = render(<GetStartedComponent />);

    const welcomePanel = getByTestId('welcome-panel');
    const togglePanel = getByTestId('toggle-panel');

    expect(welcomePanel).toBeInTheDocument();
    expect(togglePanel).toBeInTheDocument();
  });
});
