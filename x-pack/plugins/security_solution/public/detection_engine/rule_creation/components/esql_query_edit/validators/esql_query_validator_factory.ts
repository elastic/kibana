/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryClient } from '@tanstack/react-query';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { parseEsqlQuery } from '@kbn/securitysolution-utils';
import type { FormData, ValidationError, ValidationFunc } from '../../../../../shared_imports';
import type { FieldValueQueryBar } from '../../../../rule_creation_ui/components/query_bar_field';
import { fetchEsqlQueryColumns } from '../../../logic/esql_query_columns';
import { ESQL_ERROR_CODES } from './error_codes';
import * as i18n from './translations';

interface EsqlQueryValidatorFactoryParams {
  queryClient: QueryClient;
  /**
   * This is a temporal fix to unlock prebuilt rule customization workflow
   */
  skipIdColumnCheck?: boolean;
}

export function esqlQueryValidatorFactory({
  queryClient,
  skipIdColumnCheck,
}: EsqlQueryValidatorFactoryParams): ValidationFunc<FormData, string, FieldValueQueryBar> {
  return async (...args) => {
    const [{ value }] = args;
    const esqlQuery = value.query.query as string;

    if (esqlQuery.trim() === '') {
      return;
    }

    try {
      const { isEsqlQueryAggregating, hasMetadataOperator, errors } = parseEsqlQuery(esqlQuery);

      // Check if there are any syntax errors
      if (errors.length) {
        return constructSyntaxError(new Error(errors[0].message));
      }

      // non-aggregating query which does not have metadata, is not a valid one
      if (!isEsqlQueryAggregating && !hasMetadataOperator) {
        return {
          code: ESQL_ERROR_CODES.ERR_MISSING_ID_FIELD_FROM_RESULT,
          message: i18n.ESQL_VALIDATION_MISSING_METADATA_OPERATOR_IN_QUERY_ERROR,
        };
      }

      if (skipIdColumnCheck) {
        return;
      }

      const columns = await fetchEsqlQueryColumns({
        esqlQuery,
        queryClient,
      });

      // for non-aggregating query, we want to disable queries w/o _id property returned in response
      if (!isEsqlQueryAggregating && !hasIdColumn(columns)) {
        return {
          code: ESQL_ERROR_CODES.ERR_MISSING_ID_FIELD_FROM_RESULT,
          message: i18n.ESQL_VALIDATION_MISSING_ID_FIELD_IN_QUERY_ERROR,
        };
      }
    } catch (error) {
      return constructValidationError(error);
    }
  };
}

function hasIdColumn(columns: DatatableColumn[]): boolean {
  return columns.some(({ id }) => '_id' === id);
}

function constructSyntaxError(error: Error): ValidationError {
  return {
    code: ESQL_ERROR_CODES.INVALID_SYNTAX,
    message: error?.message
      ? i18n.esqlValidationErrorMessage(error.message)
      : i18n.ESQL_VALIDATION_UNKNOWN_ERROR,
    error,
  };
}

function constructValidationError(error: Error): ValidationError {
  return {
    code: ESQL_ERROR_CODES.INVALID_ESQL,
    message: error?.message
      ? i18n.esqlValidationErrorMessage(error.message)
      : i18n.ESQL_VALIDATION_UNKNOWN_ERROR,
    error,
  };
}
