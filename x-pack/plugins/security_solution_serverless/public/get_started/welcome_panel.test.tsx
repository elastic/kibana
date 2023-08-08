/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, type RenderResult } from '@testing-library/react';
import { WelcomePanel } from './welcome_panel';
jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    useEuiTheme: jest.fn().mockReturnValue({
      euiTheme: { base: 16, size: { xs: '4px' }, colors: { mediumShade: '' } },
    }),
  };
});

describe('WelcomePanel', () => {
  let result: RenderResult;

  beforeEach(() => {
    result = render(<WelcomePanel />);
  });

  it('should render the welcome panel with project created header card', () => {
    const { getByText } = result;

    expect(getByText('Project created')).toBeInTheDocument();
  });

  it('should render the welcome panel with invite your team header card', () => {
    const { getByText } = result;

    expect(getByText('Invite your team')).toBeInTheDocument();
  });

  it('should render the welcome panel with progress tracker header card', () => {
    const { getByText } = result;

    expect(getByText('Progress tracker')).toBeInTheDocument();
  });

  it('should render the project created header card with the correct icon', () => {
    const { getByTestId } = result;

    expect(getByTestId('projectCreatedIcon')).toBeInTheDocument();
  });

  it('should render the invite your team header card with the correct icon', () => {
    const { getByTestId } = result;

    expect(getByTestId('inviteYourTeamIcon')).toBeInTheDocument();
  });

  it('should render the progress tracker header card with the correct icon', () => {
    const { getByTestId } = result;

    expect(getByTestId('progressTrackerIcon')).toBeInTheDocument();
  });
});
