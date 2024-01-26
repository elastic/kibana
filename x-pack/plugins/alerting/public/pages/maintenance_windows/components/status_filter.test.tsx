/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Query } from '@elastic/eui';
import { fireEvent } from '@testing-library/react';
import React from 'react';

import { AppMockRenderer, createAppMockRenderer } from '../../../lib/test_utils';
import { StatusFilter } from './status_filter';

describe('StatusFilter', () => {
  let appMockRenderer: AppMockRenderer;
  const onChange = jest.fn();
  const query = Query.parse('');

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRenderer = createAppMockRenderer();
  });

  test('it renders', () => {
    const result = appMockRenderer.render(<StatusFilter query={query} onChange={onChange} />);

    expect(result.getByTestId('status-filter-button')).toBeInTheDocument();
  });

  test('it shows the popover', () => {
    const result = appMockRenderer.render(<StatusFilter query={query} onChange={onChange} />);

    fireEvent.click(result.getByTestId('status-filter-button'));
    expect(result.getByTestId('status-filter-running')).toBeInTheDocument();
    expect(result.getByTestId('status-filter-upcoming')).toBeInTheDocument();
    expect(result.getByTestId('status-filter-finished')).toBeInTheDocument();
    expect(result.getByTestId('status-filter-archived')).toBeInTheDocument();
  });
});
