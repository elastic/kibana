/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EQL_ERROR_CODES } from '../../../common/hooks/eql/api';
import { ESQL_ERROR_CODES } from '../components/esql_query_edit';

// const ESQL_FIELD_NAME = i18n.translate(
//   'xpack.securitySolution.detectionEngine.createRule.nonBlockingErrorCodes.esqlFieldName',
//   {
//     defaultMessage: 'ES|QL Query',
//   }
// );

// const EQL_FIELD_NAME = i18n.translate(
//   'xpack.securitySolution.detectionEngine.createRule.nonBlockingErrorCodes.eqlFieldName',
//   {
//     defaultMessage: 'EQL Query',
//   }
// );

export const NON_BLOCKING_ERROR_CODES = [
  ESQL_ERROR_CODES.INVALID_ESQL,
  EQL_ERROR_CODES.FAILED_REQUEST,
  EQL_ERROR_CODES.INVALID_EQL,
  EQL_ERROR_CODES.MISSING_DATA_SOURCE,
] as const;
