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

export const ESQL_VALIDATION_MISSING_METADATA_OPERATOR_IN_QUERY_ERROR = i18n.translate(
  'xpack.securitySolution.detectionEngine.esqlValidation.missingMetadataOperatorInQueryError',
  {
    defaultMessage: `Queries that don’t use the STATS...BY function (non-aggregating queries) must include the "metadata _id, _version, _index" operator after the source command. For example: FROM logs* metadata _id, _version, _index.`,
  }
);

export const ESQL_VALIDATION_MISSING_ID_FIELD_IN_QUERY_ERROR = i18n.translate(
  'xpack.securitySolution.detectionEngine.esqlValidation.missingIdFieldInQueryError',
  {
    defaultMessage: `Queries that don’t use the STATS...BY function (non-aggregating queries) must include the "metadata _id, _version, _index" operator after the source command. For example: FROM logs* metadata _id, _version, _index.  In addition, the metadata properties (_id, _version, and _index)  must be returned in the query response.`,
  }
);
