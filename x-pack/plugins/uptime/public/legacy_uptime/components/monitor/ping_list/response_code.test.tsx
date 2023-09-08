/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ResponseCodeColumn } from './columns/response_code';

describe('ResponseCodeColumn', () => {
  const statusCode = '200';

  it('render when statusCode is available', () => {
    const { getByText } = render(<ResponseCodeColumn statusCode={statusCode} />);

    expect(getByText(statusCode)).toBeInTheDocument();
  });

  it('renders error content when statusCode is unavailable', () => {
    const { queryByText } = render(<ResponseCodeColumn statusCode={''} />);

    expect(queryByText('--')).toBeInTheDocument();
  });
});
