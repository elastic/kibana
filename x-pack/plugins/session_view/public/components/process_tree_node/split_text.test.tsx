/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { SplitText } from './split_text';

describe('SplitText component', () => {
  it('should split a text into one span for each character', async () => {
    const text = 'hello world';

    const renderResult = render(<SplitText>{text}</SplitText>);
    for (const char of text.replace(/\s+/g, '').split('')) {
      expect(await renderResult.findAllByText(char)).toBeTruthy();
    }
    expect(renderResult.container.textContent?.replace(/\s+/g, ' ')).toEqual(text);
  });
});
