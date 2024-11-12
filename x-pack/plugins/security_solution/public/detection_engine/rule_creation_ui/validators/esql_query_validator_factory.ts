/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryClient } from '@tanstack/react-query';
import { isEmpty } from 'lodash';
import { i18n } from '@kbn/i18n';
import type { ESQLAstQueryExpression, ESQLCommandOption } from '@kbn/esql-ast';
import { parse } from '@kbn/esql-ast';
import { isAggregatingQuery } from '@kbn/securitysolution-utils';
import { isColumnItem, isOptionItem } from '@kbn/esql-validation-autocomplete';
import { getESQLQueryColumns } from '@kbn/esql-utils';
import type { FormData, ValidationError, ValidationFunc } from '../../../shared_imports';
import { KibanaServices } from '../../../common/lib/kibana';
import type { FieldValueQueryBar } from '../components/query_bar';

export enum ESQL_ERROR_CODES {
  INVALID_ESQL = 'ERR_INVALID_ESQL',
  INVALID_SYNTAX = 'ERR_INVALID_SYNTAX',
  ERR_MISSING_ID_FIELD_FROM_RESULT = 'ERR_MISSING_ID_FIELD_FROM_RESULT',
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
    },
  },
});

export function esqlQueryValidatorFactory(): ValidationFunc<FormData, string, FieldValueQueryBar> {
  return async (...args) => {
    const [{ value }] = args;
    const esqlQuery = value.query.query as string;

    if (isEmpty(esqlQuery)) {
      return;
    }

    try {
      const services = KibanaServices.get();
      const { isEsqlQueryAggregating, isMissingMetadataOperator, errors } =
        parseEsqlQuery(esqlQuery);

      // Check if there are any syntax errors
      if (errors.length) {
        return constructSyntaxError(new Error(errors[0].message));
      }

      if (isMissingMetadataOperator) {
        return {
          code: ESQL_ERROR_CODES.ERR_MISSING_ID_FIELD_FROM_RESULT,
          message: ESQL_VALIDATION_MISSING_METADATA_OPERATOR_IN_QUERY_ERROR,
        };
      }

      const columns = await queryClient.fetchQuery({
        queryKey: [esqlQuery.trim()],
        queryFn: () =>
          getESQLQueryColumns({
            esqlQuery,
            search: services.data.search.search,
          }),
      });

      // check whether _id field is present in response
      const isIdFieldPresent = columns.find(({ id }) => '_id' === id);

      // for non-aggregating query, we want to disable queries w/o _id property returned in response
      if (!isEsqlQueryAggregating && !isIdFieldPresent) {
        return {
          code: ESQL_ERROR_CODES.ERR_MISSING_ID_FIELD_FROM_RESULT,
          message: ESQL_VALIDATION_MISSING_ID_FIELD_IN_QUERY_ERROR,
        };
      }
    } catch (error) {
      return constructValidationError(error);
    }
  };
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
    // non-aggregating query which does not have metadata, is not a valid one
    isMissingMetadataOperator: !isEsqlQueryAggregating && !computeHasMetadataOperator(root),
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
      ? esqlValidationErrorMessage(error.message)
      : ESQL_VALIDATION_UNKNOWN_ERROR,
    error,
  };
}

function constructValidationError(error: Error): ValidationError {
  return {
    code: ESQL_ERROR_CODES.INVALID_ESQL,
    message: error?.message
      ? esqlValidationErrorMessage(error.message)
      : ESQL_VALIDATION_UNKNOWN_ERROR,
    error,
  };
}

const ESQL_VALIDATION_UNKNOWN_ERROR = i18n.translate(
  'xpack.securitySolution.detectionEngine.esqlValidation.unknownError',
  {
    defaultMessage: 'Unknown error while validating ES|QL',
  }
);

const esqlValidationErrorMessage = (message: string) =>
  i18n.translate('xpack.securitySolution.detectionEngine.esqlValidation.errorMessage', {
    values: { message },
    defaultMessage: 'Error validating ES|QL: "{message}"',
  });

const ESQL_VALIDATION_MISSING_METADATA_OPERATOR_IN_QUERY_ERROR = i18n.translate(
  'xpack.securitySolution.detectionEngine.esqlValidation.missingMetadataOperatorInQueryError',
  {
    defaultMessage: `Queries that don’t use the STATS...BY function (non-aggregating queries) must include the "metadata _id, _version, _index" operator after the source command. For example: FROM logs* metadata _id, _version, _index.`,
  }
);

const ESQL_VALIDATION_MISSING_ID_FIELD_IN_QUERY_ERROR = i18n.translate(
  'xpack.securitySolution.detectionEngine.esqlValidation.missingIdFieldInQueryError',
  {
    defaultMessage: `Queries that don’t use the STATS...BY function (non-aggregating queries) must include the "metadata _id, _version, _index" operator after the source command. For example: FROM logs* metadata _id, _version, _index.  In addition, the metadata properties (_id, _version, and _index)  must be returned in the query response.`,
  }
);
