/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { mockLayerList } from './__mocks__/regions_layer.mock';
import { useLayerList } from './use_layer_list';

describe('useLayerList', () => {
  test('it returns the region layer', () => {
    const { result } = renderHook(() => useLayerList());
    expect(result.current).toStrictEqual(mockLayerList);
  });
});
