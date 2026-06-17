/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { SpanDatabase } from './span_db';

describe('SpanDatabase', () => {
  it('renders the title and statement when spanDb has a statement', () => {
    render(<SpanDatabase spanDb={{ statement: 'SELECT * FROM users', type: 'sql' }} />);

    expect(screen.getByText('Database statement')).toBeInTheDocument();
    expect(screen.getByText('SELECT * FROM users')).toBeInTheDocument();
  });

  it('does not render when spanDb is undefined', () => {
    const { container } = render(<SpanDatabase />);
    expect(container).toBeEmptyDOMElement();
  });

  it('does not render when spanDb has no statement', () => {
    const { container } = render(<SpanDatabase spanDb={{ type: 'sql' }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('does not render when spanDb.statement is an empty string', () => {
    const { container } = render(<SpanDatabase spanDb={{ statement: '', type: 'sql' }} />);
    expect(container).toBeEmptyDOMElement();
  });
});
