/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';

import { mockDataFormattedForFieldBrowser } from '../mocks/mock_context';
import { useHighlightedFields } from './use_highlighted_fields';

const dataFormattedForFieldBrowser = mockDataFormattedForFieldBrowser;

describe('useHighlightedFields', () => {
  it('should return data', () => {
    const hookResult = renderHook(() => useHighlightedFields({ dataFormattedForFieldBrowser }));
    expect(hookResult.result.current).toEqual({
      'kibana.alert.rule.type': {
        values: ['query'],
      },
    });
  });
});
