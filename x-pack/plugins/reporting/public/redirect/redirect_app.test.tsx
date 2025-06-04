/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import { sharePluginMock } from 'src/plugins/share/public/mocks';
import { scopedHistoryMock } from 'src/core/public/mocks';
import { RedirectApp } from './redirect_app';
import { REPORTING_REDIRECT_LOCATOR_STORE_KEY } from '../../common/constants';

const mockApiClient = {
  getInfo: jest.fn(),
};
const mockShare = sharePluginMock.createSetupContract();
const historyMock = scopedHistoryMock.create();
function setLocationSearch(search: string) {
  window.history.pushState({}, '', search);
}

describe('RedirectApp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear the window property before each test
    delete (window as any)[REPORTING_REDIRECT_LOCATOR_STORE_KEY];
  });

  afterEach(() => {
    // Reset the URL to the root after each test
    window.history.pushState({}, '', '/');
    // Clean up window property
    delete (window as any)[REPORTING_REDIRECT_LOCATOR_STORE_KEY];
  });

  it('navigates using share.navigate when locator params are present in window object', async () => {
    setLocationSearch('?jobId=happy');
    const locatorParams = { id: 'LENS_APP_LOCATOR', params: { foo: 'bar' } };
    // Set the locator params in window object
    (window as any)[REPORTING_REDIRECT_LOCATOR_STORE_KEY] = locatorParams;

    render(
      <RedirectApp apiClient={mockApiClient as any} share={mockShare} history={historyMock} />
    );

    await waitFor(() => {
      expect(mockShare.navigate).toHaveBeenCalledWith(locatorParams);
    });
  });

  it('displays error when locator params are not available', async () => {
    setLocationSearch('?jobId=fail');
    // Do not set the locator params
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <RedirectApp apiClient={mockApiClient as any} share={mockShare} history={historyMock} />
    );

    await waitFor(() => {
      expect(screen.getByText('Redirect error')).toBeInTheDocument();
      expect(screen.getByText('Could not find locator params for report')).toBeInTheDocument();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Redirect page error:'),
        'Could not find locator params for report'
      );
    });

    consoleErrorSpy.mockRestore();
  });

  describe('non-app locator', () => {
    it('throws error when using non-allowed locator type', async () => {
      setLocationSearch('');
      // Set a non-allowed locator type
      (window as any)[REPORTING_REDIRECT_LOCATOR_STORE_KEY] = {
        id: 'LEGACY_SHORT_URL_LOCATOR',
        params: {},
      };

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <RedirectApp apiClient={mockApiClient as any} share={mockShare} history={historyMock} />
      );

      await waitFor(() =>
        expect(
          screen.getByText(
            'Report job execution can only redirect using a locator for an expected analytical app'
          )
        ).toBeInTheDocument()
      );

      expect(mockShare.navigate).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `Report job execution cannot redirect using LEGACY_SHORT_URL_LOCATOR`
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Redirect page error:'),
        'Report job execution can only redirect using a locator for an expected analytical app'
      );
      consoleErrorSpy.mockRestore();
    });
  });
});
