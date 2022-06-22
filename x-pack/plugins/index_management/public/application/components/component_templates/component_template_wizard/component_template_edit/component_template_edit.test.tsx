/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { createMemoryHistory } from 'history';
import { useTabFromQueryString } from './component_template_edit';

describe('useTabFromQueryString', () => {
  it('should return undefined if not tab is set in the url', () => {
    const history = createMemoryHistory();
    history.push('/app/management/data/index_management/edit_component_template');

    const {
      result: { current: tab },
    } = renderHook(() => useTabFromQueryString(history));

    expect(tab).not.toBeDefined();
  });

  it('should return the tab if set in the url', () => {
    const history = createMemoryHistory();
    history.push('/app/management/data/index_management/edit_component_template?tab=mappings');

    const {
      result: { current: tab },
    } = renderHook(() => useTabFromQueryString(history));

    expect(tab).toBe('mappings');
  });
});
