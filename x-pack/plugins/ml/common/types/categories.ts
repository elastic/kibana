/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { CATEGORY_EXAMPLES_VALIDATION_STATUS } from '../constants/new_job';

export type CategoryId = number;

export interface Category {
  job_id: string;
  category_id: CategoryId;
  terms: string;
  regex: string;
  max_matching_length: number;
  examples: string[];
  grok_pattern: string;
}

export interface Token {
  token: string;
  start_offset: number;
  end_offset: number;
  type: string;
  position: number;
}

export interface CategorizationAnalyzer {
  char_filter?: any[];
  tokenizer?: string;
  filter?: any[];
  analyzer?: string;
}

export interface CategoryFieldExample {
  text: string;
  tokens: Token[];
}

export enum VALIDATION_RESULT {
  TOKEN_COUNT,
  MEDIAN_LINE_LENGTH,
  NULL_VALUES,
  NO_EXAMPLES,
  TOO_MANY_TOKENS,
  FAILED_TO_TOKENIZE,
  INSUFFICIENT_PRIVILEGES,
}

export interface FieldExampleCheck {
  id: VALIDATION_RESULT;
  valid: CATEGORY_EXAMPLES_VALIDATION_STATUS;
  message: string;
}

export const VALIDATION_CHECK_DESCRIPTION = {
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
        'More than 3 tokens per example were found in over 75% of the examples loaded.',
    }
  ),
  [VALIDATION_RESULT.MEDIAN_LINE_LENGTH]: i18n.translate(
    'xpack.ml.models.jobService.categorization.messages.validMedianLineLength',
    {
      defaultMessage: 'The median line length of the examples loaded was less than 400 characters.',
    }
  ),
  [VALIDATION_RESULT.NULL_VALUES]: i18n.translate(
    'xpack.ml.models.jobService.categorization.messages.validNullValues',
    {
      defaultMessage: 'Less than 25% of the examples loaded were null.',
    }
  ),
  [VALIDATION_RESULT.NO_EXAMPLES]: i18n.translate(
    'xpack.ml.models.jobService.categorization.messages.validNoDataFound',
    {
      defaultMessage: 'Examples  were successfully loaded.',
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
