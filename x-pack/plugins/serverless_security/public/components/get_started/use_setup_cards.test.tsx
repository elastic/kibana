/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { EuiThemeComputed } from '@elastic/eui';
import { useSetUpCardSections } from './use_setup_cards';

const mockEuiTheme: EuiThemeComputed = {
  size: {
    l: '16px',
    base: '20px',
  },
};

describe('useSetUpCardSections', () => {
  it('should return the set up sections', () => {
    const { result } = renderHook(() => useSetUpCardSections({ euiTheme: mockEuiTheme }));

    const activeSections = new Set<string>(['analytics', 'cloud']);
    const finishedSteps = {
      card1: new Set<string>(['step1', 'step2']),
      card2: new Set<string>(['step3']),
    };

    const sections = result.current.setUpSections(activeSections, jest.fn(), finishedSteps);

    expect(sections).toHaveLength(2);

    const firstSection = sections[0];
    expect(firstSection.type).toBe('div');
    expect(firstSection.props.children).toHaveLength(2);

    const secondSection = sections[1];
    expect(secondSection.type).toBe('div');
    expect(secondSection.props.children).toHaveLength(1);
  });

  it('should return null if no active sections are provided', () => {
    const { result } = renderHook(() => useSetUpCardSections({ euiTheme: mockEuiTheme }));

    const activeSections = new Set<string>();
    const finishedSteps = {
      card1: new Set<string>(['step1', 'step2']),
      card2: new Set<string>(['step3']),
    };

    const sections = result.current.setUpSections(activeSections, jest.fn(), finishedSteps);

    expect(sections).toBeNull();
  });
});
