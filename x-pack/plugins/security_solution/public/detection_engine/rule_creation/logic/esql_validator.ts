/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import type { QueryClient } from '@tanstack/react-query';
import { computeIsESQLQueryAggregating } from '@kbn/securitysolution-utils';

import { KibanaServices } from '../../../common/lib/kibana';

import type { ValidationError, ValidationFunc } from '../../../shared_imports';
import { isEsqlRule } from '../../../../common/detection_engine/utils';
import type { DefineStepRule } from '../../../detections/pages/detection_engine/rules/types';
import type { FieldValueQueryBar } from '../../rule_creation_ui/components/query_bar';
import * as i18n from './translations';
import { getEsqlQueryConfig } from './get_esql_query_config';
export type FieldType = 'string';

export enum ERROR_CODES {
  INVALID_ESQL = 'ERR_INVALID_ESQL',
  ERR_MISSING_ID_FIELD_FROM_RESULT = 'ERR_MISSING_ID_FIELD_FROM_RESULT',
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

/**
 * checks whether query has metadata _id operator
 */
export const computeHasMetadataOperator = (esqlQuery: string) => {
  return /(?<!\|[\s\S.]*)\s*metadata[\s\S.]*_id[\s\S.]*/i.test(esqlQuery?.split('|')?.[0]);
};

/**
 * form validator for ES|QL queryBar
 */
export const esqlValidator = async (
  ...args: Parameters<ValidationFunc>
): Promise<ValidationError<ERROR_CODES> | void | undefined> => {
  const [{ value, formData, customData }] = args;
  const queryClient = (customData.value as { queryClient: QueryClient | undefined }).queryClient;

  const { query: queryValue } = value as FieldValueQueryBar;
  const query = queryValue.query as string;
  const { ruleType } = formData as DefineStepRule;

  const needsValidation = isEsqlRule(ruleType) && !isEmpty(query);
  if (!needsValidation) {
    return;
  }

  try {
    const services = KibanaServices.get();
    const { isEsqlQueryAggregating, isMissingMetadataOperator } = parseEsqlQuery(query);

    if (isMissingMetadataOperator) {
      return {
        code: ERROR_CODES.ERR_MISSING_ID_FIELD_FROM_RESULT,
        message: i18n.ESQL_VALIDATION_MISSING_ID_IN_QUERY_ERROR,
      };
    }

    const data = await queryClient?.fetchQuery(
      getEsqlQueryConfig({ esqlQuery: query, expressions: services.expressions })
    );

    if (data && 'error' in data) {
      return constructValidationError(data.error);
    }

    // check whether _id field is present in response
    const isIdFieldPresent = (data?.columns ?? []).find(({ id }) => '_id' === id);
    // for non-aggregating query, we want to disable queries w/o _id property returned in response
    if (!isEsqlQueryAggregating && !isIdFieldPresent) {
      return {
        code: ERROR_CODES.ERR_MISSING_ID_FIELD_FROM_RESULT,
        message: i18n.ESQL_VALIDATION_MISSING_ID_IN_QUERY_ERROR,
      };
    }
  } catch (error) {
    return constructValidationError(error);
  }
};

/**
 * check if esql query valid for Security rule:
 * - it it's non aggregation query it must have metadata operator
 */
export const parseEsqlQuery = (query: string) => {
  const isEsqlQueryAggregating = computeIsESQLQueryAggregating(query);

  return {
    isEsqlQueryAggregating,
    // non-aggregating query which does not have [metadata], is not a valid one
    isMissingMetadataOperator: !isEsqlQueryAggregating && !computeHasMetadataOperator(query),
  };
};
