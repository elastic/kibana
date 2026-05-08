/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useServiceMapFullScreen } from './use_service_map_fullscreen';
import {
  SERVICE_MAP_FULL_SCREEN_CLASS,
  SERVICE_MAP_RESTRICT_BODY_CLASS,
  SERVICE_MAP_WRAPPER_FULL_SCREEN_CLASS,
  MOCK_EUI_THEME_FOR_USE_THEME,
} from './constants';

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    useEuiTheme: () => ({ euiTheme: MOCK_EUI_THEME_FOR_USE_THEME }),
  };
});

describe('useServiceMapFullScreen', () => {
  it('returns bodyClassesToToggle as an array of string class names', () => {
    const { result } = renderHook(() => useServiceMapFullScreen());

    expect(result.current.bodyClassesToToggle).toBeDefined();
    expect(Array.isArray(result.current.bodyClassesToToggle)).toBe(true);
    expect(result.current.bodyClassesToToggle.length).toBeGreaterThan(0);
    result.current.bodyClassesToToggle.forEach((cls) => {
      expect(typeof cls).toBe('string');
      expect(cls.length).toBeGreaterThan(0);
    });
  });

  it('includes expected constant class names in bodyClassesToToggle', () => {
    const { result } = renderHook(() => useServiceMapFullScreen());

    expect(result.current.bodyClassesToToggle).toContain(SERVICE_MAP_RESTRICT_BODY_CLASS);
    expect(result.current.bodyClassesToToggle).toContain(SERVICE_MAP_WRAPPER_FULL_SCREEN_CLASS);
  });

  it('returns styles object with full screen class key', () => {
    const { result } = renderHook(() => useServiceMapFullScreen());

    expect(result.current.styles).toBeDefined();
    expect(result.current.styles[SERVICE_MAP_FULL_SCREEN_CLASS]).toBeDefined();
  });
});
