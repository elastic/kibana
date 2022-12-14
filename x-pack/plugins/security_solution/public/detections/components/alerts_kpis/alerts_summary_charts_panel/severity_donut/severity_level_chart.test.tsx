/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { render } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../../../common/mock';
import { SeverityLevelChart } from './severity_level_chart';

jest.mock('../../../../../common/lib/kibana');

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useLocation: jest.fn().mockReturnValue({ pathname: '' }) };
});

describe('Severity level chart', () => {
  const defaultProps = {
    data: [],
    isLoading: false,
    uniqueQueryId: 'test-query-id',
  };

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  test('renders correctly', () => {
    const { container } = render(
      <TestProviders>
        <SeverityLevelChart {...defaultProps} />
      </TestProviders>
    );
    expect(container.querySelector('[data-test-subj="severty-chart"]')).toBeInTheDocument();
  });

  test('render HeaderSection', () => {
    const { container } = render(
      <TestProviders>
        <SeverityLevelChart {...defaultProps} />
      </TestProviders>
    );
    expect(container.querySelector(`[data-test-subj="header-section"]`)).toBeInTheDocument();
  });

  test('inspect button renders correctly', () => {
    const { container } = render(
      <TestProviders>
        <SeverityLevelChart {...defaultProps} />
      </TestProviders>
    );
    expect(container.querySelector('[data-test-subj="inspect-icon-button"]')).toBeInTheDocument();
  });
});
