/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export interface OsqueryActiveLicenses {
  isActivePlatinumLicense: boolean;
}

export const validateLicense = (license?: OsqueryActiveLicenses) => {
  if (!license) {
    return;
  }

  const { isActivePlatinumLicense } = license;

  if (!isActivePlatinumLicense) {
    return LICENSE_TOO_LOW;
  }
};

export const LICENSE_TOO_LOW = i18n.translate(
  'xpack.osquery.liveQueryActions.error.licenseTooLow',
  {
    defaultMessage: 'At least Platinum license is required to use Response Actions.',
  }
);
