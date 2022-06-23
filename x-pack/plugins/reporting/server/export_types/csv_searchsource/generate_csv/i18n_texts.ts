/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const i18nTexts = {
  escapedFormulaValuesMessage: i18n.translate(
    'xpack.reporting.exportTypes.csv.generateCsv.escapedFormulaValues',
    {
      defaultMessage: 'CSV may contain formulas whose values have been escaped',
    }
  ),
  authenticationError: {
    partialResultsMessage: i18n.translate(
      'xpack.reporting.exportTypes.csv.generateCsv.authenticationExpired.partialResultsMessage',
      {
        defaultMessage:
          'This report contains partial CSV results because the authentication token expired. Export a smaller amount of data or increase the timeout of the authentication token.',
      }
    ),
  },
  esErrorMessage: (statusCode: number, message: string) =>
    i18n.translate('xpack.reporting.exportTypes.csv.generateCsv.esErrorMessage', {
      defaultMessage: 'Received a {statusCode} response from Elasticsearch: {message}',
      values: { statusCode, message },
    }),
  unknownError: (message: string = 'unknown') =>
    i18n.translate('xpack.reporting.exportTypes.csv.generateCsv.unknownErrorMessage', {
      defaultMessage: 'Encountered an unknown error: {message}',
      values: { message },
    }),
};
