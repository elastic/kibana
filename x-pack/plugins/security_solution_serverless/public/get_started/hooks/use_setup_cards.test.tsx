/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import type { EuiThemeComputed } from '@elastic/eui';
import { useSetUpSections } from './use_setup_cards';
import { QuickStart } from '../types';

const mockEuiTheme: EuiThemeComputed = {
  size: {
    l: '16px',
    base: '20px',
  },
  colors: { lightestShade: '' },
} as EuiThemeComputed;

describe('useSetUpSections', () => {
  it('should return sections', () => {
    const { result } = renderHook(() => useSetUpSections());
    const finishedCards = new Set([QuickStart.createFirstProject]);

    const sections = result.current.setUpSections({
      euiTheme: mockEuiTheme,
      finishedCards,
    });

    expect(sections).toHaveLength(3);
  });
});
