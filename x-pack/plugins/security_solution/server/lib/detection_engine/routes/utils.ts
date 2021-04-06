/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import Joi from 'joi';
import { errors } from '@elastic/elasticsearch';
import { has, snakeCase } from 'lodash/fp';
import { SanitizedAlert } from '../../../../../alerting/common';

import {
  RouteValidationFunction,
  KibanaResponseFactory,
  CustomHttpResponseOptions,
  SavedObjectsFindResult,
} from '../../../../../../../src/core/server';
import { AlertsClient } from '../../../../../alerting/server';
import { BadRequestError } from '../errors/bad_request_error';
import { RuleStatusResponse, IRuleStatusSOAttributes } from '../rules/types';

export interface OutputError {
  message: string;
  statusCode: number;
}

export const transformError = (err: Error & Partial<errors.ResponseError>): OutputError => {
  if (Boom.isBoom(err)) {
    return {
      message: err.output.payload.message,
      statusCode: err.output.statusCode,
    };
  } else {
    if (err.statusCode != null) {
      if (err.body?.error != null) {
        return {
          statusCode: err.statusCode,
          message: `${err.body.error.type}: ${err.body.error.reason}`,
        };
      } else {
        return {
          statusCode: err.statusCode,
          message: err.message,
        };
      }
    } else if (err instanceof BadRequestError) {
      // allows us to throw request validation errors in the absence of Boom
      return {
        message: err.message,
        statusCode: 400,
      };
    } else {
      // natively return the err and allow the regular framework
      // to deal with the error when it is a non Boom
      return {
        message: err.message ?? '(unknown error message)',
        statusCode: 500,
      };
    }
  }
};

export interface BulkError {
  id?: string;
  rule_id?: string;
  error: {
    status_code: number;
    message: string;
  };
}

export const createBulkErrorObject = ({
  ruleId,
  id,
  statusCode,
  message,
}: {
  ruleId?: string;
  id?: string;
  statusCode: number;
  message: string;
}): BulkError => {
  if (id != null && ruleId != null) {
    return {
      id,
      rule_id: ruleId,
      error: {
        status_code: statusCode,
        message,
      },
    };
  } else if (id != null) {
    return {
      id,
      error: {
        status_code: statusCode,
        message,
      },
    };
  } else if (ruleId != null) {
    return {
      rule_id: ruleId,
      error: {
        status_code: statusCode,
        message,
      },
    };
  } else {
    return {
      rule_id: '(unknown id)',
      error: {
        status_code: statusCode,
        message,
      },
    };
  }
};

export interface ImportRegular {
  rule_id: string;
  status_code: number;
  message?: string;
}

export type ImportRuleResponse = ImportRegular | BulkError;

export const isBulkError = (
  importRuleResponse: ImportRuleResponse
): importRuleResponse is BulkError => {
  return has('error', importRuleResponse);
};

export const isImportRegular = (
  importRuleResponse: ImportRuleResponse
): importRuleResponse is ImportRegular => {
  return !has('error', importRuleResponse) && has('status_code', importRuleResponse);
};

export interface ImportSuccessError {
  success: boolean;
  success_count: number;
  errors: BulkError[];
}

export const createSuccessObject = (
  existingImportSuccessError: ImportSuccessError
): ImportSuccessError => {
  return {
    success_count: existingImportSuccessError.success_count + 1,
    success: existingImportSuccessError.success,
    errors: existingImportSuccessError.errors,
  };
};

export const createImportErrorObject = ({
  ruleId,
  statusCode,
  message,
  existingImportSuccessError,
}: {
  ruleId: string;
  statusCode: number;
  message: string;
  existingImportSuccessError: ImportSuccessError;
}): ImportSuccessError => {
  return {
    success: false,
    errors: [
      ...existingImportSuccessError.errors,
      createBulkErrorObject({
        ruleId,
        statusCode,
        message,
      }),
    ],
    success_count: existingImportSuccessError.success_count,
  };
};

export const transformImportError = (
  ruleId: string,
  err: Error & { statusCode?: number },
  existingImportSuccessError: ImportSuccessError
): ImportSuccessError => {
  if (Boom.isBoom(err)) {
    return createImportErrorObject({
      ruleId,
      statusCode: err.output.statusCode,
      message: err.message,
      existingImportSuccessError,
    });
  } else if (err instanceof BadRequestError) {
    return createImportErrorObject({
      ruleId,
      statusCode: 400,
      message: err.message,
      existingImportSuccessError,
    });
  } else {
    return createImportErrorObject({
      ruleId,
      statusCode: err.statusCode ?? 500,
      message: err.message,
      existingImportSuccessError,
    });
  }
};

export const transformBulkError = (
  ruleId: string,
  err: Error & { statusCode?: number }
): BulkError => {
  if (Boom.isBoom(err)) {
    return createBulkErrorObject({
      ruleId,
      statusCode: err.output.statusCode,
      message: err.message,
    });
  } else if (err instanceof BadRequestError) {
    return createBulkErrorObject({
      ruleId,
      statusCode: 400,
      message: err.message,
    });
  } else {
    return createBulkErrorObject({
      ruleId,
      statusCode: err.statusCode ?? 500,
      message: err.message,
    });
  }
};

export const buildRouteValidation = <T>(schema: Joi.Schema): RouteValidationFunction<T> => (
  payload: T,
  { ok, badRequest }
) => {
  const { value, error } = schema.validate(payload);
  if (error) {
    return badRequest(error.message);
  }
  return ok(value);
};

const statusToErrorMessage = (statusCode: number) => {
  switch (statusCode) {
    case 400:
      return 'Bad Request';
    case 401:
      return 'Unauthorized';
    case 403:
      return 'Forbidden';
    case 404:
      return 'Not Found';
    case 409:
      return 'Conflict';
    case 500:
      return 'Internal Error';
    default:
      return '(unknown error)';
  }
};

export class SiemResponseFactory {
  constructor(private response: KibanaResponseFactory) {}

  error<T>({ statusCode, body, headers }: CustomHttpResponseOptions<T>) {
    const contentType: CustomHttpResponseOptions<T>['headers'] = {
      'content-type': 'application/json',
    };
    const defaultedHeaders: CustomHttpResponseOptions<T>['headers'] = {
      ...contentType,
      ...(headers ?? {}),
    };

    return this.response.custom({
      headers: defaultedHeaders,
      statusCode,
      body: Buffer.from(
        JSON.stringify({
          message: body ?? statusToErrorMessage(statusCode),
          status_code: statusCode,
        })
      ),
    });
  }
}

export const buildSiemResponse = (response: KibanaResponseFactory) =>
  new SiemResponseFactory(response);

export const convertToSnakeCase = <T extends Record<string, unknown>>(
  obj: T
): Partial<T> | null => {
  if (!obj) {
    return null;
  }
  return Object.keys(obj).reduce((acc, item) => {
    const newKey = snakeCase(item);
    return { ...acc, [newKey]: obj[item] };
  }, {});
};

/**
 *
 * @param id rule id
 * @param currentStatusAndFailures array of rule statuses where the 0th status is the current status and 1-5 positions are the historical failures
 * @param acc accumulated rule id : statuses
 */
export const mergeStatuses = (
  id: string,
  currentStatusAndFailures: Array<SavedObjectsFindResult<IRuleStatusSOAttributes>>,
  acc: RuleStatusResponse
): RuleStatusResponse => {
  if (currentStatusAndFailures.length === 0) {
    return {
      ...acc,
    };
  }
  const convertedCurrentStatus = convertToSnakeCase<IRuleStatusSOAttributes>(
    currentStatusAndFailures[0].attributes
  );
  return {
    ...acc,
    [id]: {
      current_status: convertedCurrentStatus,
      failures: currentStatusAndFailures
        .slice(1)
        .map((errorItem) => convertToSnakeCase<IRuleStatusSOAttributes>(errorItem.attributes)),
    },
  } as RuleStatusResponse;
};

export type GetFailingRulesResult = Record<string, SanitizedAlert>;

export const getFailingRules = async (
  ids: string[],
  alertsClient: AlertsClient
): Promise<GetFailingRulesResult> => {
  try {
    const errorRules = await Promise.all(
      ids.map(async (id) =>
        alertsClient.get({
          id,
        })
      )
    );
    return errorRules
      .filter((rule) => rule.executionStatus.status === 'error')
      .reduce<GetFailingRulesResult>((acc, failingRule) => {
        const accum = acc;
        const theRule = failingRule;
        return {
          [theRule.id]: {
            ...theRule,
          },
          ...accum,
        };
      }, {});
  } catch (exc) {
    throw new Error(`Failed to get executionStatus with AlertsClient: ${exc.message}`);
  }
};
