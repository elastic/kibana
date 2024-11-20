/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryClient } from '@tanstack/react-query';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import type { ESQLAstQueryExpression, ESQLCommandOption } from '@kbn/esql-ast';
import { parse } from '@kbn/esql-ast';
import { isAggregatingQuery } from '@kbn/securitysolution-utils';
import { isColumnItem, isOptionItem } from '@kbn/esql-validation-autocomplete';
import type { FormData, ValidationError, ValidationFunc } from '../../../../../shared_imports';
import type { FieldValueQueryBar } from '../../../../rule_creation_ui/components/query_bar_field';
import { fetchEsqlQueryColumns } from '../../../logic/esql_query_columns';
import { ESQL_ERROR_CODES } from './error_codes';
import * as i18n from './translations';

interface EsqlQueryValidatorFactoryParams {
  queryClient: QueryClient;
}

export function esqlQueryValidatorFactory({
  queryClient,
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

/**
 * check if esql query valid for Security rule:
 * - if it's non aggregation query it must have metadata operator
 */
function parseEsqlQuery(query: string) {
  const { root, errors } = parse(query);
  const isEsqlQueryAggregating = isAggregatingQuery(root);

  return {
    errors,
    isEsqlQueryAggregating,
    hasMetadataOperator: computeHasMetadataOperator(root),
  };
}

/**
 * checks whether query has metadata _id operator
 */
function computeHasMetadataOperator(astExpression: ESQLAstQueryExpression): boolean {
  // Check whether the `from` command has `metadata` operator
  const metadataOption = getMetadataOption(astExpression);
  if (!metadataOption) {
    return false;
  }

  // Check whether the `metadata` operator has `_id` argument
  const idColumnItem = metadataOption.args.find(
    (fromArg) => isColumnItem(fromArg) && fromArg.name === '_id'
  );
  if (!idColumnItem) {
    return false;
  }

  return true;
}

function getMetadataOption(astExpression: ESQLAstQueryExpression): ESQLCommandOption | undefined {
  const fromCommand = astExpression.commands.find((x) => x.name === 'from');

  if (!fromCommand?.args) {
    return undefined;
  }

  // Check whether the `from` command has `metadata` operator
  for (const fromArg of fromCommand.args) {
    if (isOptionItem(fromArg) && fromArg.name === 'metadata') {
      return fromArg;
    }
  }

  return undefined;
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
