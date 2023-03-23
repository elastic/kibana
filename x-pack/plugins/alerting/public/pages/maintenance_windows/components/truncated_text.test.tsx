/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { TruncatedText } from './truncated_text';
import { AppMockRenderer, createAppMockRenderer } from '../../../lib/test_utils';

describe('TruncatedText', () => {
  let appMockRenderer: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRenderer = createAppMockRenderer();
  });

  test('it renders', () => {
    const result = appMockRenderer.render(<TruncatedText text="Test text" />);

    const text = result.getByText('Test text');
    expect(text).toBeInTheDocument();
    expect(text).toHaveStyleRule('text-overflow', 'ellipsis');
    expect(text).toHaveStyleRule('display', '-webkit-box');
    expect(text).toHaveStyleRule('-webkit-line-clamp', '3');
    expect(text).toHaveStyleRule('-webkit-box-orient', 'vertical');
    expect(text).toHaveStyleRule('overflow', 'hidden');
    expect(text).toHaveStyleRule('word-break', 'break-word');
  });
});
