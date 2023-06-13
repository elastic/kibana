/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';

import type { ValidationError, ValidationFunc } from '../../../../shared_imports';
import { isEsqlRule } from '../../../../../common/detection_engine/utils';
import type { DefineStepRule } from '../../../pages/detection_engine/rules/types';
import type { FieldValueQueryBar } from '../query_bar';
import type { GetEsqlFields } from './use_esql_query';

export enum ERROR_CODES {
  INVALID_ESQL = 'ERR_INVALID_ESQL',
}

export const esqlValidator = async (
  ...args: Parameters<ValidationFunc>
): Promise<ValidationError<ERROR_CODES> | void | undefined> => {
  const [{ value, formData, customData }] = args;
  const { query: queryValue } = value as FieldValueQueryBar;
  const query = queryValue.query as string;
  const { ruleType } = formData as DefineStepRule;

  const needsValidation = isEsqlRule(ruleType) && !isEmpty(query);
  if (!needsValidation) {
    return;
  }

  try {
    const provider = (await customData.provider()) as { getEsqlFields: GetEsqlFields };

    await provider.getEsqlFields(query);
  } catch (error) {
    return {
      code: ERROR_CODES.INVALID_ESQL,
      message: error?.message
        ? `Error validating ESQL: "${error?.message}"`
        : 'Unknown error while validating ESQL',
      error,
    };
  }
};
