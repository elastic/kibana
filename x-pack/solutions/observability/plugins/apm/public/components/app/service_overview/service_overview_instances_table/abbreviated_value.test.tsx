/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { AbbreviatedValue } from './abbreviated_value';

describe('AbbreviatedValue', () => {
  it('renders tpm with abbr tag for transactions per minute', () => {
    const { container } = render(
      <AbbreviatedValue value="1.0 tpm" abbreviation="tpm" title="transactions per minute" />
    );

    const abbr = container.querySelector('abbr');
    expect(abbr).toBeInTheDocument();
    expect(abbr).toHaveAttribute('title', 'transactions per minute');
    expect(abbr).toHaveTextContent('tpm');
    expect(container).toHaveTextContent('1.0 tpm');
  });

  it('renders ms with abbr tag for milliseconds', () => {
    const { container } = render(
      <AbbreviatedValue value="500 ms" abbreviation="ms" title="milliseconds" />
    );

    const abbr = container.querySelector('abbr');
    expect(abbr).toBeInTheDocument();
    expect(abbr).toHaveAttribute('title', 'milliseconds');
    expect(abbr).toHaveTextContent('ms');
    expect(container).toHaveTextContent('500 ms');
  });

  it('renders N/A without abbr tag when value does not contain abbreviation', () => {
    const { container } = render(
      <AbbreviatedValue value="N/A" abbreviation="tpm" title="transactions per minute" />
    );

    const abbr = container.querySelector('abbr');
    expect(abbr).not.toBeInTheDocument();
    expect(container).toHaveTextContent('N/A');
  });

  it('renders < 0.1 tpm with abbr tag', () => {
    const { container } = render(
      <AbbreviatedValue value="< 0.1 tpm" abbreviation="tpm" title="transactions per minute" />
    );

    const abbr = container.querySelector('abbr');
    expect(abbr).toBeInTheDocument();
    expect(abbr).toHaveAttribute('title', 'transactions per minute');
    expect(container).toHaveTextContent('< 0.1 tpm');
  });

  it('renders 0 ms with abbr tag', () => {
    const { container } = render(
      <AbbreviatedValue value="0 ms" abbreviation="ms" title="milliseconds" />
    );

    const abbr = container.querySelector('abbr');
    expect(abbr).toBeInTheDocument();
    expect(abbr).toHaveAttribute('title', 'milliseconds');
    expect(container).toHaveTextContent('0 ms');
  });
});
