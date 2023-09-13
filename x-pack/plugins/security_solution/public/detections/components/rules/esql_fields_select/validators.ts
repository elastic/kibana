/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { fetchFieldsFromESQL } from '@kbn/text-based-editor';
import type { ExpressionsStart, Datatable } from '@kbn/expressions-plugin/public';
import { computeIsESQLQueryAggregating } from '@kbn/securitysolution-utils';

import { KibanaServices } from '../../../../common/lib/kibana';
import { securitySolutionQueryClient } from '../../../../common/containers/query_client/query_client_provider';

import type { ValidationError, ValidationFunc } from '../../../../shared_imports';
import { isEsqlRule } from '../../../../../common/detection_engine/utils';
import type { DefineStepRule } from '../../../pages/detection_engine/rules/types';
import type { FieldValueQueryBar } from '../query_bar';
import * as i18n from './translations';

export type FieldType = 'string';

export enum ERROR_CODES {
  INVALID_ESQL = 'ERR_INVALID_ESQL',
  ERR_MISSING_ID_FIELD_FROM_RESULT = 'ERR_MISSING_ID_FIELD_FROM_RESULT',
  INVALID_ESQL_SUPPRESS_BY_FIELDS = 'INVALID_ESQL_SUPPRESS_BY_FIELDS',
}

const constructValidationError = (error: Error) => {
  return {
    code: ERROR_CODES.INVALID_ESQL,
    message: error?.message
      ? i18n.esqlValidationErrorMessage(error.message)
      : i18n.ESQL_VALIDATION_UNKNOWN_ERROR,
    error,
  };
};

const constructSuppressByFieldsValidationError = (error: Error) => {
  return {
    code: ERROR_CODES.INVALID_ESQL_SUPPRESS_BY_FIELDS,
    message: i18n.ESQL_VALIDATION_SUPPRESS_BY_GENERAL_ERROR,
    error,
  };
};

export const getEsqlQueryConfig = ({
  esqlQuery,
  expressions,
}: {
  esqlQuery: string | undefined;
  expressions: ExpressionsStart;
}) => {
  const emptyResultsEsqlQuery = `${esqlQuery} | limit 0`;
  return {
    queryKey: [esqlQuery ?? ''.trim()],
    queryFn: async () => {
      if (!esqlQuery) {
        return undefined;
      }
      try {
        const res = await fetchFieldsFromESQL({ esql: emptyResultsEsqlQuery }, expressions);
        return res;
      } catch (e) {
        // TODO: separate network error?
        return { error: e };
      }
    },
    staleTime: 60 * 1000,
  };
};

const fetchEsqlFields = (esqlQuery: string) => {
  const services = KibanaServices.get();

  return securitySolutionQueryClient.fetchQuery(
    getEsqlQueryConfig({ esqlQuery, expressions: services.expressions })
  );
};

export const esqlToOptions = (
  data: { error: unknown } | Datatable | undefined,
  fieldType?: FieldType
) => {
  if (data && 'error' in data) {
    return [];
  }

  const options = (data?.columns ?? [])
    .filter(({ meta }) => {
      // if fieldType absent, we do not filter columns by type
      if (!fieldType) {
        return true;
      }
      return fieldType === meta.type;
    })
    .map(({ id }) => ({ label: id }));

  return options;
};

export const fetchEsqlOptions = async (esqlQuery: string) => {
  try {
    const data = await fetchEsqlFields(esqlQuery);

    return esqlToOptions(data);
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

    // for non-aggregating fields we want to disable queries w/o _id property
    if (
      !computeIsESQLQueryAggregating(query) &&
      !(data?.columns ?? []).find(({ id }) => '_id' === id)
    ) {
      return {
        code: ERROR_CODES.ERR_MISSING_ID_FIELD_FROM_RESULT,
        message: i18n.ESQL_VALIDATION_MISSING_ID_IN_QUERY_ERROR,
      };
    }
  } catch (error) {
    return constructValidationError(error);
  }
};

export const esqlSuppressByFieldsValidator = async (
  ...args: Parameters<ValidationFunc>
): Promise<ValidationError<ERROR_CODES> | void | undefined> => {
  const [{ value, formData, path }] = args;
  const suppressByFields = (value ?? []) as string[];
  const query = formData.queryBar?.query?.query as string;

  const { ruleType } = formData as DefineStepRule;

  const needsValidation = isEsqlRule(ruleType) && !isEmpty(query) && suppressByFields?.length > 0;
  if (!needsValidation) {
    return;
  }

  try {
    const data = await fetchEsqlFields(query);

    if (data && 'error' in data) {
      return constructSuppressByFieldsValidationError(data.error);
    }

    const options = (data?.columns ?? []).map(({ id }) => ({ label: id }));
    const optionsSet = new Set(options?.map((option) => option.label));

    const errorFields: string[] = [];

    suppressByFields?.forEach((field) => {
      if (!optionsSet.has(field)) {
        errorFields.push(field);
      }
    });

    if (errorFields.length) {
      return {
        code: ERROR_CODES.INVALID_ESQL_SUPPRESS_BY_FIELDS,
        path,
        message: i18n.esqlValidationInvalidSuppressByFields(errorFields.join(', ')),
      };
    }
  } catch (error) {
    return constructSuppressByFieldsValidationError(error);
  }
};
