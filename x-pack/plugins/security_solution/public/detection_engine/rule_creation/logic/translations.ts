/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ESQL_VALIDATION_UNKNOWN_ERROR = i18n.translate(
  'xpack.securitySolution.detectionEngine.esqlValidation.unknownError',
  {
    defaultMessage: 'Unknown error while validating ES|QL',
  }
);

export const esqlValidationErrorMessage = (message: string) =>
  i18n.translate('xpack.securitySolution.detectionEngine.esqlValidation.errorMessage', {
    values: { message },
    defaultMessage: 'Error validating ES|QL: "{message}"',
  });

export const ESQL_VALIDATION_MISSING_ID_IN_QUERY_ERROR = i18n.translate(
  'xpack.securitySolution.detectionEngine.esqlValidation.missingIdInQueryError',
  {
    defaultMessage: `For non-aggregating queries(that don't use STATS..BY function), use [metadata _id, _version, _index] operator after source index and ensure _id property is returned in response`,
  }
);
