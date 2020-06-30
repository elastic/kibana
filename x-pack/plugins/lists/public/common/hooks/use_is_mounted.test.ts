/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderHook } from '@testing-library/react-hooks';

import { useIsMounted } from './use_is_mounted';

describe('useIsMounted', () => {
  it('evaluates to true when mounted', () => {
    const { result } = renderHook(() => useIsMounted());

    expect(result.current()).toEqual(true);
  });

  it('evaluates to false when unmounted', () => {
    const { result, unmount } = renderHook(() => useIsMounted());

    unmount();
    expect(result.current()).toEqual(false);
  });
});
