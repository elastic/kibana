/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { render } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../../common/mock';
import { AlertsByRulePanel } from '.';

jest.mock('../../../../common/lib/kibana');

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useLocation: jest.fn().mockReturnValue({ pathname: '' }) };
});

describe('Alert by rule panel', () => {
  const defaultProps = {
    signalIndexName: 'signalIndexName',
    skip: false,
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders correctly', async () => {
    const { container } = render(
      <TestProviders>
        <AlertsByRulePanel {...defaultProps} />
      </TestProviders>
    );
    expect(container.querySelector('[data-test-subj="alerts-by-rule-panel"]')).toBeInTheDocument();
  });

  test('renders HeaderSection', async () => {
    const { container } = render(
      <TestProviders>
        <AlertsByRulePanel {...defaultProps} />
      </TestProviders>
    );
    expect(container.querySelector(`[data-test-subj="header-section"]`)).toBeInTheDocument();
  });

  test('renders inspect button', async () => {
    const { container } = render(
      <TestProviders>
        <AlertsByRulePanel {...defaultProps} />
      </TestProviders>
    );
    expect(container.querySelector('[data-test-subj="inspect-icon-button"]')).toBeInTheDocument();
  });

  test('renders alert by rule chart', async () => {
    const { container } = render(
      <TestProviders>
        <AlertsByRulePanel {...defaultProps} />
      </TestProviders>
    );
    expect(container.querySelector('[data-test-subj="alerts-by-rule"]')).toBeInTheDocument();
  });
});
