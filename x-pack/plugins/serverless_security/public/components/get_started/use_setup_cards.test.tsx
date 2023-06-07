/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { EuiThemeComputed } from '@elastic/eui';
import { useSetUpCardSections } from './use_setup_cards';
import { CardId, GetSetUpCardId, IntroductionSteps, ProductId, StepId } from './types';

const mockEuiTheme: EuiThemeComputed = {
  size: {
    l: '16px',
    base: '20px',
  },
} as EuiThemeComputed;
const finishedSteps = {
  [GetSetUpCardId.introduction]: new Set<StepId>([IntroductionSteps.watchOverviewVideo]),
} as Record<CardId, Set<StepId>>;
describe('useSetUpCardSections', () => {
  it('should return the set up sections', () => {
    const { result } = renderHook(() => useSetUpCardSections({ euiTheme: mockEuiTheme }));

    const activeSections = new Set<ProductId>([ProductId.analytics, ProductId.cloud]);

    const sections = result.current.setUpSections(activeSections, jest.fn(), finishedSteps);

    expect(sections).toHaveLength(2);
  });

  it('should return null if no active sections are provided', () => {
    const { result } = renderHook(() => useSetUpCardSections({ euiTheme: mockEuiTheme }));

    const activeSections = new Set<ProductId>();

    const sections = result.current.setUpSections(activeSections, jest.fn(), finishedSteps);

    expect(sections).toBeNull();
  });
});
