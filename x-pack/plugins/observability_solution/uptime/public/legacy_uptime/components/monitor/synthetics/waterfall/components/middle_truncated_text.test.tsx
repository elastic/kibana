/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { within, fireEvent, waitFor } from '@testing-library/react';
import { getChunks, MiddleTruncatedText } from './middle_truncated_text';
import { render } from '../../../../../lib/helper/rtl_helpers';

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
  it('renders truncated text and aria label', () => {
    const { getByText, getByLabelText } = render(
      <MiddleTruncatedText
        index={1}
        text={longString}
        ariaLabel={longString}
        url={url}
        onClick={jest.fn()}
        highestIndex={10}
      />
    );

    expect(getByText(first)).toBeInTheDocument();
    expect(getByText(last)).toBeInTheDocument();

    expect(getByLabelText(longString)).toBeInTheDocument();
  });

  it('renders screen reader only text', () => {
    const { getByTestId } = render(
      <MiddleTruncatedText
        index={1}
        text={longString}
        ariaLabel={longString}
        url={url}
        highestIndex={10}
      />
    );

    const { getByText } = within(getByTestId('middleTruncatedTextSROnly'));

    expect(getByText(longString)).toBeInTheDocument();
  });

  it('renders external link', () => {
    const { getByText } = render(
      <MiddleTruncatedText
        index={1}
        text={longString}
        ariaLabel={longString}
        url={url}
        highestIndex={10}
      />
    );
    const link = getByText('Open resource in new tab').closest('a');

    expect(link).toHaveAttribute('href', url);
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('renders a button when onClick function is passed', async () => {
    const handleClick = jest.fn();
    const { getByTestId } = render(
      <MiddleTruncatedText
        index={1}
        text={longString}
        ariaLabel={longString}
        url={url}
        onClick={handleClick}
        highestIndex={10}
      />
    );
    const button = getByTestId('middleTruncatedTextButton1');
    fireEvent.click(button);

    await waitFor(() => {
      expect(handleClick).toBeCalled();
    });
  });
});
