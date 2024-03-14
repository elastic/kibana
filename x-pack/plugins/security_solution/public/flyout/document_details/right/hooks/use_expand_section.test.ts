/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RenderHookResult } from '@testing-library/react-hooks';
import { renderHook } from '@testing-library/react-hooks';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import type { UseExpandSectionParams } from './use_expand_section';
import { useExpandSection } from './use_expand_section';

describe('useExpandSection', () => {
  let hookResult: RenderHookResult<UseExpandSectionParams, boolean>;

  it('should return default value if nothing in localStorage', () => {
    const mockStorage = {
      get: jest.fn().mockReturnValue(undefined),
    };
    const initialProps: UseExpandSectionParams = {
      title: 'test',
      defaultValue: true,
      storage: mockStorage as unknown as Storage,
    };

    hookResult = renderHook((props: UseExpandSectionParams) => useExpandSection(props), {
      initialProps,
    });

    expect(hookResult.result.current).toBe(true);
  });

  it(`should return default value if localStorage doesn't have the correct key`, () => {
    const mockStorage = {
      get: jest.fn().mockReturnValue({ other: false }),
    };
    const initialProps: UseExpandSectionParams = {
      title: 'test',
      defaultValue: true,
      storage: mockStorage as unknown as Storage,
    };

    hookResult = renderHook((props: UseExpandSectionParams) => useExpandSection(props), {
      initialProps,
    });

    expect(hookResult.result.current).toBe(true);
  });

  it('should return value from local storage', () => {
    const mockStorage = {
      get: jest.fn().mockReturnValue({ test: false }),
    };
    const initialProps: UseExpandSectionParams = {
      title: 'test',
      defaultValue: true,
      storage: mockStorage as unknown as Storage,
    };

    hookResult = renderHook((props: UseExpandSectionParams) => useExpandSection(props), {
      initialProps,
    });

    expect(hookResult.result.current).toBe(false);
  });
});
