/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import {
  banners,
  toastNotifications,
} from 'ui/notify';
import { EuiText } from '@elastic/eui';

/**
 * Handle clicks from the user on the opt-in banner.
 *
 * @param {String} bannerId Banner ID to close upon success.
 * @param {Object} telemetryOptInProvider the telemetry opt-in provider
 * @param {Boolean} optIn {@code true} to opt into telemetry.
 * @param {Object} _banners Singleton banners. Can be overridden for tests.
 * @param {Object} _toastNotifications Singleton toast notifications. Can be overridden for tests.
 */
export async function clickBanner(
  bannerId,
  telemetryOptInProvider,
  optIn,
  { _banners = banners, _toastNotifications = toastNotifications } = {}) {

  let set = false;

  try {
    set = await telemetryOptInProvider.setOptIn(optIn);
  } catch (err) {
    // set is already false
    console.log('Unexpected error while trying to save setting.', err);
  }

  if (set) {
    _banners.remove(bannerId);
  } else {
    _toastNotifications.addDanger({
      title: 'Telemetry Error',
      text: (
        <EuiText>
          <p>Unable to save telemetry preference.</p>
          <EuiText size="xs">
            Check that Kibana and Elasticsearch are still running, then try again.
          </EuiText>
        </EuiText>
      )
    });
  }
}
