/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TutorialRedirect } from './redirect';

const mockNavigateToApp = jest.fn();
let mockServerlessOnboarding = false;

jest.mock('../../../context/apm_plugin/use_apm_plugin_context', () => ({
  useApmPluginContext: () => ({
    config: { serverlessOnboarding: mockServerlessOnboarding },
    core: {
      application: { navigateToApp: mockNavigateToApp },
    },
  }),
}));

function renderRedirect(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <TutorialRedirect />
    </MemoryRouter>
  );
}

describe('TutorialRedirect', () => {
  beforeEach(() => {
    mockNavigateToApp.mockClear();
    mockServerlessOnboarding = false;
  });

  it('copies search onto the home tutorial hash', () => {
    renderRedirect('/tutorial?returnAppId=observabilityOnboarding&returnPath=%3F');

    expect(mockNavigateToApp).toHaveBeenCalledWith('home', {
      path: '#/tutorial/apm?returnAppId=observabilityOnboarding&returnPath=%3F',
      replace: true,
    });
  });

  it('keeps the hash path when search is empty', () => {
    renderRedirect('/tutorial');

    expect(mockNavigateToApp).toHaveBeenCalledWith('home', {
      path: '#/tutorial/apm',
      replace: true,
    });
  });

  it('does not copy search onto serverless onboarding', () => {
    mockServerlessOnboarding = true;
    renderRedirect('/tutorial?returnAppId=observabilityOnboarding&returnPath=%3F');

    expect(mockNavigateToApp).toHaveBeenCalledWith('apm', {
      path: '/onboarding',
      replace: true,
    });
  });
});
