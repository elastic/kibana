/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderHook } from '@testing-library/react-hooks';
import { mockLayerList } from './__mocks__/regions_layer.mock';
import { useLayerList } from './useLayerList';

describe('useLayerList', () => {
  test('it returns the region layer', () => {
    const { result } = renderHook(() => useLayerList());
    expect(result.current).toStrictEqual(mockLayerList);
  });
});
