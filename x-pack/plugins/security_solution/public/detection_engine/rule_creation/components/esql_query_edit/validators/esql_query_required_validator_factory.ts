/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fieldValidators, type FormData, type ValidationFunc } from '../../../../../shared_imports';
import type { FieldValueQueryBar } from '../../../../rule_creation_ui/components/query_bar_field';
import * as i18n from './translations';

export function esqlQueryRequiredValidatorFactory(): ValidationFunc<
  FormData,
  string,
  FieldValueQueryBar
> {
  return async (data) => {
    const { value } = data;
    const esqlQuery = value.query.query as string;

    if (esqlQuery.trim() === '') {
      return;
    }

    return fieldValidators.emptyField(i18n.ESQL_QUERY_VALIDATION_REQUIRED)({
      ...data,
      value: esqlQuery,
    });
  };
}
