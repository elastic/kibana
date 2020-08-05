/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { renderHook } from '@testing-library/react-hooks';

import { useCollapsibleList } from './use_collapsible_list';

describe('useCollapseList', () => {
  it('handles undefined', () => {
    const { result } = renderHook(() => useCollapsibleList({ items: undefined }));
    expect(result.current.items).toBe('all');
    expect(result.current.hiddenItemsCount).toBe(0);
  });

  it('handles csv', () => {
    const { result } = renderHook(() => useCollapsibleList({ items: 'a,b,c' }));
    expect(result.current.items).toEqual(['a', 'b', 'c']);
    expect(result.current.hiddenItemsCount).toBe(0);
  });

  it('hides items passed a defined maximum (10)', () => {
    const items = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k'];
    const { result } = renderHook(() => useCollapsibleList({ items }));
    expect(result.current.items).toEqual(items.slice(0, -1));
    expect(result.current.hiddenItemsCount).toBe(1);
  });
});
