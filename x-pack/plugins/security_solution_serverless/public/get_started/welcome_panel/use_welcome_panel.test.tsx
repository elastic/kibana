/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useWelcomePanel } from './use_welcome_panel';
import { ProductTier } from '../../../common/product';

jest.mock('../../common/services', () => ({
  useKibana: jest.fn(() => ({
    services: {
      cloud: { projectsUrl: 'projectsUrl' },
    },
  })),
}));

describe('useWelcomePanel', () => {
  it('should return the correct welcome panel sections', () => {
    const productTier = ProductTier.essentials;
    const totalActiveSteps = 5;
    const totalStepsLeft = 3;

    const { result } = renderHook(() =>
      useWelcomePanel({ productTier, totalActiveSteps, totalStepsLeft })
    );

    expect(result.current[0].title).toBe('Project created');
    expect(result.current[1].title).toBe('Invite your team');
    expect(result.current[2].title).toBe('Progress tracker');
  });
});
