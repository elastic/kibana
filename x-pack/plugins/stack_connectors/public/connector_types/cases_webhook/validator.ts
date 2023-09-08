/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ERROR_CODE } from '@kbn/es-ui-shared-plugin/static/forms/helpers/field_validators/types';
import {
  ValidationError,
  ValidationFunc,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { containsChars, isUrl } from '@kbn/es-ui-shared-plugin/static/validators/string';
import { templateActionVariable } from '@kbn/triggers-actions-ui-plugin/public';
import * as i18n from './translations';
import { casesVars, commentVars, urlVars, urlVarsExt } from './action_variables';

const errorCode: ERROR_CODE = 'ERR_FIELD_MISSING';

const missingVariableErrorMessage = (path: string, variables: string[]) => ({
  code: errorCode,
  path,
  message: i18n.MISSING_VARIABLES(variables),
});

export const containsTitleAndDesc =
  () =>
  (...args: Parameters<ValidationFunc>): ReturnType<ValidationFunc<any, ERROR_CODE>> => {
    const [{ value, path }] = args;
    const title = templateActionVariable(
      casesVars.find((actionVariable) => actionVariable.name === 'case.title')!
    );
    const description = templateActionVariable(
      casesVars.find((actionVariable) => actionVariable.name === 'case.description')!
    );
    const varsWithErrors = [title, description].filter(
      (variable) => !containsChars(variable)(value as string).doesContain
    );

    if (varsWithErrors.length > 0) {
      return missingVariableErrorMessage(path, varsWithErrors);
    }
  };

export const containsExternalId =
  () =>
  (...args: Parameters<ValidationFunc>): ReturnType<ValidationFunc<any, ERROR_CODE>> => {
    const [{ value, path }] = args;

    const id = templateActionVariable(
      urlVars.find((actionVariable) => actionVariable.name === 'external.system.id')!
    );
    return containsChars(id)(value as string).doesContain
      ? undefined
      : missingVariableErrorMessage(path, [id]);
  };

export const containsExternalIdOrTitle =
  () =>
  (...args: Parameters<ValidationFunc>): ReturnType<ValidationFunc<any, ERROR_CODE>> => {
    const [{ value, path }] = args;

    const id = templateActionVariable(
      urlVars.find((actionVariable) => actionVariable.name === 'external.system.id')!
    );
    const title = templateActionVariable(
      urlVarsExt.find((actionVariable) => actionVariable.name === 'external.system.title')!
    );
    const error = missingVariableErrorMessage(path, [id, title]);
    if (typeof value === 'string') {
      const { doesContain: doesContainId } = containsChars(id)(value);
      const { doesContain: doesContainTitle } = containsChars(title)(value);
      if (doesContainId || doesContainTitle) {
        return undefined;
      }
    }
    return error;
  };

export const containsCommentsOrEmpty =
  (message: string) =>
  (...args: Parameters<ValidationFunc>): ReturnType<ValidationFunc<any, ERROR_CODE>> => {
    const [{ value, path }] = args;
    if (typeof value !== 'string') {
      return {
        code: 'ERR_FIELD_FORMAT',
        formatType: 'STRING',
        message,
      };
    }
    if (value.length === 0) {
      return undefined;
    }

    const comment = templateActionVariable(
      commentVars.find((actionVariable) => actionVariable.name === 'case.comment')!
    );
    let error;
    if (typeof value === 'string') {
      const { doesContain } = containsChars(comment)(value);
      if (!doesContain) {
        error = missingVariableErrorMessage(path, [comment]);
      }
    }
    return error;
  };

export const isUrlButCanBeEmpty =
  (message: string) =>
  (...args: Parameters<ValidationFunc>) => {
    const [{ value }] = args;
    const error: ValidationError<ERROR_CODE> = {
      code: 'ERR_FIELD_FORMAT',
      formatType: 'URL',
      message,
    };
    if (typeof value !== 'string') {
      return error;
    }
    if (value.length === 0) {
      return undefined;
    }
    return isUrl(value) ? undefined : error;
  };
