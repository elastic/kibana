/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';

import { BackLink } from './back_link';

describe('BackLink', () => {
  it('renders back to selection link', () => {
    const expectedUrl = '/app/experimental-onboarding';
    const queryParams = new URLSearchParams();
    queryParams.set('observabilityOnboardingLink', expectedUrl);
    const { getByText, getByRole } = render(
      <BackLink queryParams={queryParams} href="/app/integrations" />
    );
    expect(getByText('Back to selection')).toBeInTheDocument();
    expect(getByRole('link').getAttribute('href')).toBe(expectedUrl);
  });

  it('renders back to selection link with params', () => {
    const expectedUrl = '/app/experimental-onboarding&search=aws&category=infra';
    const queryParams = new URLSearchParams();
    queryParams.set('observabilityOnboardingLink', expectedUrl);
    const { getByText, getByRole } = render(
      <BackLink queryParams={queryParams} href="/app/integrations" />
    );
    expect(getByText('Back to selection')).toBeInTheDocument();
    expect(getByRole('link').getAttribute('href')).toBe(expectedUrl);
  });

  it('renders back to integrations link', () => {
    const queryParams = new URLSearchParams();
    const { getByText, getByRole } = render(
      <BackLink queryParams={queryParams} href="/app/integrations" />
    );
    expect(getByText('Back to integrations')).toBeInTheDocument();
    expect(getByRole('link').getAttribute('href')).toBe('/app/integrations');
  });
});
