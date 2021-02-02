/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
  const url = 'http://www.elastic.co';
  it('renders truncated text', () => {
    const { getByText } = render(<MiddleTruncatedText text={longString} url={url} />);

    expect(getByText(first)).toBeInTheDocument();
    expect(getByText(last)).toBeInTheDocument();
  });

  it('renders screen reader only text', () => {
    const { getByTestId } = render(<MiddleTruncatedText text={longString} url={url} />);

    const { getByText } = within(getByTestId('middleTruncatedTextSROnly'));

    expect(getByText(longString)).toBeInTheDocument();
  });

  it('renders external link', () => {
    const { getByText } = render(<MiddleTruncatedText text={longString} url={url} />);
    const link = getByText('Open resource in new tab').closest('a');

    expect(link).toHaveAttribute('href', url);
    expect(link).toHaveAttribute('target', '_blank');
  });
});
