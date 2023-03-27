/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import userEvent from '@testing-library/user-event';
import { StubBrowserStorage } from '@kbn/test-jest-helpers';
import { screen } from '@testing-library/react';
import { render } from '../../../lib/helper/rtl_helpers';
import { IntegrationDeprecation, INTEGRATION_DEPRECATION_SESSION_STORAGE_KEY } from '.';
import * as observabilityPublic from '@kbn/observability-plugin/public';

export const mockStorage = new StubBrowserStorage();
jest.mock('@kbn/observability-plugin/public');

const DEPRECATION_TITLE = 'Migrate your Elastic Synthetics integration monitors before Elastic 8.8';

describe('IntegrationDeprecation', () => {
  const { FETCH_STATUS } = observabilityPublic;
  it('shows deprecation notice when hasIntegrationMonitors is true', () => {
    jest.spyOn(observabilityPublic, 'useFetcher').mockReturnValue({
      status: FETCH_STATUS.SUCCESS,
      data: { hasIntegrationMonitors: true },
      refetch: () => null,
      loading: false,
    });

    render(<IntegrationDeprecation />);
    expect(screen.getByText(DEPRECATION_TITLE)).toBeInTheDocument();
  });

  it('does not show deprecation notice when hasIntegrationMonitors is false', () => {
    jest.spyOn(observabilityPublic, 'useFetcher').mockReturnValue({
      status: FETCH_STATUS.SUCCESS,
      data: { hasIntegrationMonitors: false },
      refetch: () => null,
      loading: false,
    });

    render(<IntegrationDeprecation />);
    expect(screen.queryByText(DEPRECATION_TITLE)).not.toBeInTheDocument();
  });

  it('dismisses notification', () => {
    jest.spyOn(observabilityPublic, 'useFetcher').mockReturnValue({
      status: FETCH_STATUS.SUCCESS,
      data: { hasIntegrationMonitors: true },
      refetch: () => null,
      loading: false,
    });

    render(<IntegrationDeprecation />);
    expect(screen.getByText(DEPRECATION_TITLE)).toBeInTheDocument();
    userEvent.click(screen.getByText('Dismiss'));
    expect(screen.queryByText(DEPRECATION_TITLE)).not.toBeInTheDocument();
  });

  it('does not show notification when session storage key is true', () => {
    jest.spyOn(observabilityPublic, 'useFetcher').mockReturnValue({
      status: FETCH_STATUS.SUCCESS,
      data: { hasIntegrationMonitors: true },
      refetch: () => null,
      loading: false,
    });
    mockStorage.setItem(INTEGRATION_DEPRECATION_SESSION_STORAGE_KEY, 'true');

    render(<IntegrationDeprecation />);
    expect(screen.queryByText(DEPRECATION_TITLE)).not.toBeInTheDocument();
  });
});
