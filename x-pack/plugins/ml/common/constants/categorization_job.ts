/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { VALIDATION_RESULT } from '../types/categories';

export const NUMBER_OF_CATEGORY_EXAMPLES = 5;
export const CATEGORY_EXAMPLES_SAMPLE_SIZE = 1000;
export const CATEGORY_EXAMPLES_WARNING_LIMIT = 0.75;
export const CATEGORY_EXAMPLES_ERROR_LIMIT = 0.02;

export const VALID_TOKEN_COUNT = 3;
export const MEDIAN_LINE_LENGTH_LIMIT = 400;
export const NULL_COUNT_PERCENT_LIMIT = 0.75;

export enum CATEGORY_EXAMPLES_VALIDATION_STATUS {
  VALID = 'valid',
  PARTIALLY_VALID = 'partially_valid',
  INVALID = 'invalid',
}

export const VALIDATION_CHECK_DESCRIPTION = {
  [VALIDATION_RESULT.NO_EXAMPLES]: i18n.translate(
    'xpack.ml.models.jobService.categorization.messages.validNoDataFound',
    {
      defaultMessage: 'Examples  were successfully loaded.',
    }
  ),
  [VALIDATION_RESULT.FAILED_TO_TOKENIZE]: i18n.translate(
    'xpack.ml.models.jobService.categorization.messages.validFailureToGetTokens',
    {
      defaultMessage: 'The examples loaded were tokenized successfully.',
    }
  ),
  [VALIDATION_RESULT.TOKEN_COUNT]: i18n.translate(
    'xpack.ml.models.jobService.categorization.messages.validTokenLength',
    {
      defaultMessage:
        'More than {tokenCount} tokens per example were found in over {percentage}% of the examples loaded.',
      values: {
        percentage: Math.floor(CATEGORY_EXAMPLES_WARNING_LIMIT * 100),
        tokenCount: VALID_TOKEN_COUNT,
      },
    }
  ),
  [VALIDATION_RESULT.MEDIAN_LINE_LENGTH]: i18n.translate(
    'xpack.ml.models.jobService.categorization.messages.validMedianLineLength',
    {
      defaultMessage:
        'The median line length of the examples loaded was less than {medianCharCount} characters.',
      values: {
        medianCharCount: MEDIAN_LINE_LENGTH_LIMIT,
      },
    }
  ),
  [VALIDATION_RESULT.NULL_VALUES]: i18n.translate(
    'xpack.ml.models.jobService.categorization.messages.validNullValues',
    {
      defaultMessage: 'Less than {percentage}% of the examples loaded were null.',
      values: {
        percentage: Math.floor(100 - NULL_COUNT_PERCENT_LIMIT * 100),
      },
    }
  ),
  [VALIDATION_RESULT.TOO_MANY_TOKENS]: i18n.translate(
    'xpack.ml.models.jobService.categorization.messages.validTooManyTokens',
    {
      defaultMessage: 'Less than 10000 tokens were found in total in the examples loaded.',
    }
  ),
  [VALIDATION_RESULT.INSUFFICIENT_PRIVILEGES]: i18n.translate(
    'xpack.ml.models.jobService.categorization.messages.validUserPrivileges',
    {
      defaultMessage: 'The user has sufficient privileges to perform the checks.',
    }
  ),
};
