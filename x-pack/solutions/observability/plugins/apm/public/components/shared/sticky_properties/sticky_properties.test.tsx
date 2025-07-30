/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { StickyProperties } from '.';
import { USER_ID, URL_FULL } from '../../../../common/es_fields/apm';
import { mockMoment } from '../../../utils/test_helpers';
import { renderWithTheme } from '../../../utils/test_helpers';

describe('StickyProperties', () => {
  beforeEach(() => {
    mockMoment();
  });

  it('should render properties with different types of values', () => {
    const stickyProperties = [
      {
        fieldName: URL_FULL,
        label: 'URL',
        val: 'https://www.elastic.co/test',
        truncated: true,
      },
      {
        label: 'Request method',
        fieldName: 'http.request.method',
        val: 'GET',
      },
      {
        label: 'Handled',
        fieldName: 'error.exception.handled',
        val: String(true),
      },
      {
        label: 'User ID',
        fieldName: USER_ID,
        val: '1337',
      },
    ];

    renderWithTheme(<StickyProperties stickyProperties={stickyProperties} />);

    expect(screen.getByText('URL')).toBeInTheDocument();
    expect(screen.getByText('https://www.elastic.co/test')).toBeInTheDocument();
    expect(screen.getByText('Request method')).toBeInTheDocument();
    expect(screen.getByText('GET')).toBeInTheDocument();
    expect(screen.getByText('Handled')).toBeInTheDocument();
    expect(screen.getByText('true')).toBeInTheDocument();
    expect(screen.getByText('User ID')).toBeInTheDocument();
    expect(screen.getByText('1337')).toBeInTheDocument();
  });

  it('should render numeric values correctly', () => {
    const stickyProperties = [
      {
        label: 'My Number',
        fieldName: 'myNumber',
        val: '1337',
      },
    ];

    renderWithTheme(<StickyProperties stickyProperties={stickyProperties} />);

    expect(screen.getByText('My Number')).toBeInTheDocument();
    expect(screen.getByText('1337')).toBeInTheDocument();
  });

  it('should render nested components', () => {
    const stickyProperties = [
      {
        label: 'My Component',
        fieldName: 'myComponent',
        val: <h1>My header</h1>,
      },
    ];

    renderWithTheme(<StickyProperties stickyProperties={stickyProperties} />);

    expect(screen.getByText('My Component')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('My header');
  });
});
