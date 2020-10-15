/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCallOut } from '@elastic/eui';
import { toMountPoint } from '../../../../../../src/plugins/kibana_react/public';
import { getOverlays } from '../util/dependency_cache';

let expiredLicenseBannerId: string;

export function showExpiredLicenseWarning() {
  if (expiredLicenseBannerId === undefined) {
    const message = i18n.translate('xpack.ml.checkLicense.licenseHasExpiredMessage', {
      defaultMessage: 'Your Machine Learning license has expired.',
    });
    // Only show the banner once with no way to dismiss it
    const overlays = getOverlays();
    expiredLicenseBannerId = overlays.banners.add(
      toMountPoint(<EuiCallOut iconType="iInCircle" color="warning" title={message} />)
    );
  }
}
