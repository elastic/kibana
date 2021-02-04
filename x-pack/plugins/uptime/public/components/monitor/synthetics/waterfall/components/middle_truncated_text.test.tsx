/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getChunks, MiddleTruncatedText } from './middle_truncated_text';
import { render, within } from '@testing-library/react';
import React from 'react';

const longString =
  'this-is-a-really-really-really-really-really-really-really-really-long-string.madeup.extension';
const first = 'this-is-a-really-really-really-really-really-really-really-really-long-string.made';
const last = 'up.extension';

describe('getChunks', () => {
  it('Calculates chunks correctly', () => {
    const result = getChunks(longString);
    expect(result).toEqual({
      first,
      last,
    });
  });
});

describe('Component', () => {
  it('renders truncated text', () => {
    const { getByText } = render(<MiddleTruncatedText text={longString} />);

    expect(getByText(first)).toBeInTheDocument();
    expect(getByText(last)).toBeInTheDocument();
  });

  it('renders screen reader only text', () => {
    const { getByTestId } = render(<MiddleTruncatedText text={longString} />);

    const { getByText } = within(getByTestId('middleTruncatedTextSROnly'));

    expect(getByText(longString)).toBeInTheDocument();
  });
});
