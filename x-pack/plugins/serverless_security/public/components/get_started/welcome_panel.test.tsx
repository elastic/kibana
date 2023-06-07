/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, RenderResult } from '@testing-library/react';
import { WelcomePanel } from './welcome_panel';

describe('WelcomePanelComponent', () => {
  let result: RenderResult;

  beforeEach(() => {
    result = render(<WelcomePanel />);
  });

  it('should render the welcome panel with project created header card', () => {
    const { getByText } = result;

    expect(getByText('Project Created')).toBeInTheDocument();
  });

  it('should render the welcome panel with invite your team header card', () => {
    const { getByText } = result;

    expect(getByText('Invite Your Team')).toBeInTheDocument();
  });

  it('should render the welcome panel with progress tracker header card', () => {
    const { getByText } = result;

    expect(getByText('Progress Tracker')).toBeInTheDocument();
  });

  it('should render the project created header card with the correct icon', () => {
    const { getByRole } = result;

    expect(getByRole('img', { name: 'checkInCircleFilled' })).toBeInTheDocument();
  });

  it('should render the invite your team header card with the correct icon', () => {
    const { getByRole } = result;

    expect(getByRole('img', { name: 'invite' })).toBeInTheDocument();
  });

  it('should render the progress tracker header card with the correct icon', () => {
    const { getByRole } = result;

    expect(getByRole('img', { name: 'progress' })).toBeInTheDocument();
  });

  it('should render the project created header card with the correct description', () => {
    const { getByText } = result;

    expect(getByText('Project created description')).toBeInTheDocument();
  });

  it('should render the invite your team header card with the correct description', () => {
    const { getByText } = result;

    expect(getByText('Invite your team description')).toBeInTheDocument();
  });
});
