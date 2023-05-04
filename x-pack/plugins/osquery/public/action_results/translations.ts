/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ERROR_ACTION_RESULTS = i18n.translate(
  'xpack.osquery.action_results.errorSearchDescription',
  {
    defaultMessage: `An error has occurred on action results search`,
  }
);

export const FAIL_ACTION_RESULTS = i18n.translate(
  'xpack.osquery.action_results.failSearchDescription',
  {
    defaultMessage: `Failed to fetch action results`,
  }
);

const platinumLicenseRequired = 'At least Platinum license is required to use Response Actions.';
const parametersNotFound =
  "This query hasn't been called due to parameter used and its value not found in the alert.";

export const getSkippedQueryError = (error: string) => {
  if (error === platinumLicenseRequired) {
    return i18n.translate('xpack.osquery.liveQueryActionResults.table.wrongLicenseErrorText', {
      defaultMessage: platinumLicenseRequired,
    });
  }

  if (error === parametersNotFound) {
    return i18n.translate('xpack.osquery.liveQueryActionResults.table.skippedErrorText', {
      defaultMessage: parametersNotFound,
    });
  }

  return null;
};
