/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { isValidCertVal, SettingsPage } from './settings';
import { render } from '../lib/helper/rtl_helpers';
import { fireEvent, waitFor } from '@testing-library/react';
import * as alertApi from '../state/api/alerts';
import { DYNAMIC_SETTINGS_DEFAULTS } from '../../../common/constants';

describe('settings', () => {
  describe('form', () => {
    beforeAll(() => {
      jest.spyOn(alertApi, 'fetchActionTypes').mockImplementation(async () => [
        {
          enabled: true,
          enabledInConfig: true,
          enabledInLicense: true,
          id: '.slack',
          minimumLicenseRequired: 'gold',
          name: 'Slack',
          supportedFeatureIds: ['uptime'],
          isSystemActionType: false,
        },
      ]);
    });

    it('handles no spaces error', async () => {
      const { getByText, getByTestId } = render(<SettingsPage />);

      expect(getByText(DYNAMIC_SETTINGS_DEFAULTS.heartbeatIndices));

      fireEvent.input(getByTestId('heartbeat-indices-input-loaded'), {
        target: { value: 'heartbeat-8*, synthetics-*' },
      });

      await waitFor(() => expect(getByText('Index names must not contain space')));
    });

    it('it show select a connector flyout', async () => {
      const { getByText, getByTestId } = render(<SettingsPage />);

      expect(getByText(DYNAMIC_SETTINGS_DEFAULTS.heartbeatIndices));

      fireEvent.click(getByTestId('createConnectorButton'));
      await waitFor(() => expect(getByText('Select a connector')));
    }, 10000);
  });

  describe('isValidCertVal', () => {
    it('handles NaN values', () => {
      expect(isValidCertVal(NaN)).toMatchInlineSnapshot(`"Must be a number."`);
    });

    it('handles undefined', () => {
      expect(isValidCertVal(undefined)).toMatchInlineSnapshot(`"Must be a number."`);
    });

    it('handles non-integer numbers', () => {
      expect(isValidCertVal(23.5)).toMatchInlineSnapshot(`"Value must be an integer."`);
    });

    it('handles values less than 0', () => {
      expect(isValidCertVal(-1)).toMatchInlineSnapshot(`"Value must be greater than 0."`);
    });

    it('handles 0', () => {
      expect(isValidCertVal(0)).toMatchInlineSnapshot(`"Value must be greater than 0."`);
    });

    it('allows valid integer numbers', () => {
      expect(isValidCertVal(67)).toBeUndefined();
    });
  });
});
