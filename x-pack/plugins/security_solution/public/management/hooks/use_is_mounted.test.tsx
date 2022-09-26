/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RenderHookResult } from '@testing-library/react-hooks';
import { renderHook } from '@testing-library/react-hooks';
import type { MutableRefObject } from 'react';
import { useIsMounted } from './use_is_mounted';

describe('when `useIsMounted()` is used', () => {
  let renderResult: RenderHookResult<never, MutableRefObject<boolean>>;

  beforeEach(() => {
    renderResult = renderHook(() => useIsMounted());
  });

  it('should set value to `true` when component is mounted', () => {
    expect(renderResult.result.current.current).toBe(true);
  });

  it('should set value to `false` when component is un-mounted', () => {
    renderResult.unmount();
    expect(renderResult.result.current.current).toBe(false);
  });
});
