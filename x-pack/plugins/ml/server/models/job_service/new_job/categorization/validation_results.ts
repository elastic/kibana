/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import {
  VALID_TOKEN_COUNT,
  MEDIAN_LINE_LENGTH_LIMIT,
  NULL_COUNT_PERCENT_LIMIT,
  CATEGORY_EXAMPLES_VALIDATION_STATUS,
  CATEGORY_EXAMPLES_ERROR_LIMIT,
  CATEGORY_EXAMPLES_WARNING_LIMIT,
} from '../../../../../common/constants/categorization_job';
import {
  FieldExampleCheck,
  CategoryFieldExample,
  VALIDATION_RESULT,
} from '../../../../../common/types/categories';
import { getMedianStringLength } from '../../../../../common/util/string_utils';

export class ValidationResults {
  private _results: FieldExampleCheck[] = [];

  public get results() {
    return this._results;
  }

  public get overallResult() {
    if (this._results.some((c) => c.valid === CATEGORY_EXAMPLES_VALIDATION_STATUS.INVALID)) {
      return CATEGORY_EXAMPLES_VALIDATION_STATUS.INVALID;
    }
    if (
      this._results.some((c) => c.valid === CATEGORY_EXAMPLES_VALIDATION_STATUS.PARTIALLY_VALID)
    ) {
      return CATEGORY_EXAMPLES_VALIDATION_STATUS.PARTIALLY_VALID;
    }
    return CATEGORY_EXAMPLES_VALIDATION_STATUS.VALID;
  }

  private _resultExists(id: VALIDATION_RESULT) {
    return this._results.some((r) => r.id === id);
  }

  public createTokenCountResult(examples: CategoryFieldExample[], sampleSize: number) {
    if (examples.length === 0) {
      this.createNoExamplesResult();
      return;
    }

    if (this._resultExists(VALIDATION_RESULT.INSUFFICIENT_PRIVILEGES) === true) {
      // if tokenizing has failed due to insufficient privileges, don't show
      // the message about token count
      return;
    }

    const validExamplesSize = examples.filter((e) => e.tokens.length >= VALID_TOKEN_COUNT).length;
    const percentValid = sampleSize === 0 ? 0 : validExamplesSize / sampleSize;

    let valid = CATEGORY_EXAMPLES_VALIDATION_STATUS.VALID;
    if (percentValid < CATEGORY_EXAMPLES_ERROR_LIMIT) {
      valid = CATEGORY_EXAMPLES_VALIDATION_STATUS.INVALID;
    } else if (percentValid < CATEGORY_EXAMPLES_WARNING_LIMIT) {
      valid = CATEGORY_EXAMPLES_VALIDATION_STATUS.PARTIALLY_VALID;
    }

    const message = i18n.translate(
      'xpack.ml.models.jobService.categorization.messages.tokenLengthValidation',
      {
        defaultMessage:
          '{number} field {number, plural, zero {value} one {value} other {values}} analyzed, {percentage}% contain {validTokenCount} or more tokens.',
        values: {
          number: sampleSize,
          percentage: Math.floor(percentValid * 100),
          validTokenCount: VALID_TOKEN_COUNT,
        },
      }
    );

    if (
      this._resultExists(VALIDATION_RESULT.TOO_MANY_TOKENS) === false &&
      this._resultExists(VALIDATION_RESULT.FAILED_TO_TOKENIZE) === false
    ) {
      this._results.unshift({
        id: VALIDATION_RESULT.TOKEN_COUNT,
        valid,
        message,
      });
    }
  }

  public createMedianMessageLengthResult(examples: string[]) {
    const median = getMedianStringLength(examples);

    if (median > MEDIAN_LINE_LENGTH_LIMIT) {
      this._results.push({
        id: VALIDATION_RESULT.MEDIAN_LINE_LENGTH,
        valid: CATEGORY_EXAMPLES_VALIDATION_STATUS.PARTIALLY_VALID,
        message: i18n.translate(
          'xpack.ml.models.jobService.categorization.messages.medianLineLength',
          {
            defaultMessage:
              'The median length for the field values analyzed is over {medianLimit} characters.',
            values: { medianLimit: MEDIAN_LINE_LENGTH_LIMIT },
          }
        ),
      });
    }
  }

  public createNoExamplesResult() {
    this._results.push({
      id: VALIDATION_RESULT.NO_EXAMPLES,
      valid: CATEGORY_EXAMPLES_VALIDATION_STATUS.INVALID,
      message: i18n.translate('xpack.ml.models.jobService.categorization.messages.noDataFound', {
        defaultMessage:
          'No examples for this field could be found. Please ensure the selected date range contains data.',
      }),
    });
  }

  public createNullValueResult(examples: Array<string | null | undefined>) {
    const nullCount = examples.filter((e) => e === null).length;

    if (nullCount / examples.length >= NULL_COUNT_PERCENT_LIMIT) {
      this._results.push({
        id: VALIDATION_RESULT.NULL_VALUES,
        valid: CATEGORY_EXAMPLES_VALIDATION_STATUS.PARTIALLY_VALID,
        message: i18n.translate('xpack.ml.models.jobService.categorization.messages.nullValues', {
          defaultMessage: 'More than {percent}% of field values are null.',
          values: { percent: NULL_COUNT_PERCENT_LIMIT * 100 },
        }),
      });
    }
  }

  public createTooManyTokensResult(error: any, sampleSize: number) {
    // expecting error message:
    // The number of tokens produced by calling _analyze has exceeded the allowed maximum of [10000].
    // This limit can be set by changing the [index.analyze.max_token_count] index level setting.

    if (error.statusCode === 403) {
      this.createPrivilegesErrorResult(error);
      return;
    }
    const message: string = error.message;
    if (message) {
      const rxp = /exceeded the allowed maximum of \[(\d+?)\]/;
      const match = rxp.exec(message);
      if (match?.length === 2) {
        const tokenLimit = match[1];
        this._results.push({
          id: VALIDATION_RESULT.TOO_MANY_TOKENS,
          valid: CATEGORY_EXAMPLES_VALIDATION_STATUS.INVALID,
          message: i18n.translate(
            'xpack.ml.models.jobService.categorization.messages.tooManyTokens',
            {
              defaultMessage:
                'Tokenization of field value examples has failed due to more than {tokenLimit} tokens being found in a sample of {sampleSize} values.',
              values: { sampleSize, tokenLimit },
            }
          ),
        });
        return;
      }
      return;
    }
    this.createFailureToTokenize(message);
  }

  public createPrivilegesErrorResult(error: any) {
    const message: string = error.message;
    if (message) {
      this._results.push({
        id: VALIDATION_RESULT.INSUFFICIENT_PRIVILEGES,
        valid: CATEGORY_EXAMPLES_VALIDATION_STATUS.PARTIALLY_VALID,
        message: i18n.translate(
          'xpack.ml.models.jobService.categorization.messages.insufficientPrivileges',
          {
            defaultMessage:
              'Tokenization of field value examples could not be performed due to insufficient privileges. Field values cannot therefore be checked to see if they are appropriate for use in a categorization job.',
          }
        ),
      });
      this._results.push({
        id: VALIDATION_RESULT.INSUFFICIENT_PRIVILEGES,
        valid: CATEGORY_EXAMPLES_VALIDATION_STATUS.PARTIALLY_VALID,
        message,
      });
    }
  }

  public createFailureToTokenize(message: string | undefined) {
    this._results.push({
      id: VALIDATION_RESULT.FAILED_TO_TOKENIZE,
      valid: CATEGORY_EXAMPLES_VALIDATION_STATUS.INVALID,
      message: i18n.translate(
        'xpack.ml.models.jobService.categorization.messages.failureToGetTokens',
        {
          defaultMessage:
            'It was not possible to tokenize a sample of example field values. {message}',
          values: { message: message || '' },
        }
      ),
    });
  }
}
