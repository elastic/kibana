/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { fetchFieldsFromESQL } from '@kbn/text-based-editor';

import { KibanaServices } from '../../../../common/lib/kibana';
import { securitySolutionQueryClient } from '../../../../common/containers/query_client/query_client_provider';

import type { ValidationError, ValidationFunc } from '../../../../shared_imports';
import { isEsqlRule } from '../../../../../common/detection_engine/utils';
import type { DefineStepRule } from '../../../pages/detection_engine/rules/types';
import type { FieldValueQueryBar } from '../query_bar';

export enum ERROR_CODES {
  INVALID_ESQL = 'ERR_INVALID_ESQL',
  INVALID_ESQL_GROUPING_FIELDS = 'INVALID_ESQL_GROUPING_FIELDS',
}

const constructValidationError = (error: Error) => {
  return {
    code: ERROR_CODES.INVALID_ESQL,
    message: error?.message
      ? `Error validating ESQL: "${error?.message}"`
      : 'Unknown error while validating ESQL',
    error,
  };
};

const constructGroupingFieldsValidationError = (error: Error) => {
  return {
    code: ERROR_CODES.INVALID_ESQL_GROUPING_FIELDS,
    message: 'Fields not possible to validate',
    error,
  };
};

const fetchEsqlFields = (esqlQuery: string) => {
  const services = KibanaServices.get();
  const emptyResultsEsqlQuery = `${esqlQuery} | limit 0`;

  return securitySolutionQueryClient.fetchQuery({
    queryKey: [esqlQuery.trim()],
    queryFn: async () => {
      try {
        const res = await fetchFieldsFromESQL(
          { esql: emptyResultsEsqlQuery },
          services.expressions
        );
        return res;
      } catch (e) {
        // TODO: separate network error?
        return { error: e };
      }
    },

    staleTime: 60 * 1000,
  });
};

// TODO: implement filter by type
export const fetchEsqlOptions = async (esqlQuery: string) => {
  try {
    const data = await fetchEsqlFields(esqlQuery);

    if (data && 'error' in data) {
      return [];
    }

    const options = (data?.columns ?? []).map(({ id }) => ({ label: id }));

    return options;
  } catch (e) {
    return [];
  }
};

export const esqlValidator = async (
  ...args: Parameters<ValidationFunc>
): Promise<ValidationError<ERROR_CODES> | void | undefined> => {
  const [{ value, formData }] = args;
  const { query: queryValue } = value as FieldValueQueryBar;
  const query = queryValue.query as string;
  const { ruleType } = formData as DefineStepRule;

  const needsValidation = isEsqlRule(ruleType) && !isEmpty(query);
  if (!needsValidation) {
    return;
  }

  try {
    const data = await fetchEsqlFields(query);

    if (data && 'error' in data) {
      return constructValidationError(data.error);
    }
  } catch (error) {
    return constructValidationError(error);
  }
};

export const esqlGroupingFieldsValidator = async (
  ...args: Parameters<ValidationFunc>
): Promise<ValidationError<ERROR_CODES> | void | undefined> => {
  const [{ value, formData, path }] = args;
  const groupingFields = (value ?? []) as string[];
  const query = formData.queryBar?.query?.query as string;

  const { ruleType } = formData as DefineStepRule;

  const needsValidation = isEsqlRule(ruleType) && !isEmpty(query) && groupingFields?.length > 0;
  if (!needsValidation) {
    return;
  }

  try {
    const data = await fetchEsqlFields(query);

    if (data && 'error' in data) {
      return constructGroupingFieldsValidationError(data.error);
    }

    const options = (data?.columns ?? []).map(({ id }) => ({ label: id }));
    const optionsSet = new Set(options?.map((option) => option.label));

    const errorFields: string[] = [];

    groupingFields?.forEach((field) => {
      if (!optionsSet.has(field)) {
        errorFields.push(field);
      }
    });

    if (errorFields.length) {
      return {
        code: ERROR_CODES.INVALID_ESQL_GROUPING_FIELDS,
        path,
        message: `Fields are not available in ESQL response: ${errorFields.join(', ')}`,
      };
    }
  } catch (error) {
    return constructGroupingFieldsValidationError(error);
  }
};
