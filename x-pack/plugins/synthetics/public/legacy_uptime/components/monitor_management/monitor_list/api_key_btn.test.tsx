/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import { render } from '../../../lib/helper/rtl_helpers';
import { ApiKeyBtn } from './api_key_btn';

describe('<APIKeyButton />', () => {
  const setLoadAPIKey = jest.fn();

  it('calls delete monitor on monitor deletion', () => {
    render(<ApiKeyBtn setLoadAPIKey={setLoadAPIKey} apiKey="" loading={false} />);

    expect(screen.getByText('Generate API key')).toBeInTheDocument();
    userEvent.click(screen.getByTestId('uptimeMonitorManagementApiKeyGenerate'));
    expect(setLoadAPIKey).toHaveBeenCalled();
  });

  it('shows correct content on loading', () => {
    render(<ApiKeyBtn setLoadAPIKey={setLoadAPIKey} apiKey="" loading={true} />);

    expect(screen.getByText('Generating API key')).toBeInTheDocument();
  });

  it('shows api key when available and hides button', () => {
    const apiKey = 'sampleApiKey';
    render(<ApiKeyBtn setLoadAPIKey={setLoadAPIKey} apiKey={apiKey} loading={false} />);

    expect(screen.getByText(apiKey)).toBeInTheDocument();
    expect(screen.queryByText('Generate API key')).not.toBeInTheDocument();
  });
});
