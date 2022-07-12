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
import * as i18n from './translations';
import { casesVars, commentVars, urlVars, urlVarsExt } from './action_variables';
import { templateActionVariable } from '../../../lib';

const errorCode: ERROR_CODE = 'ERR_FIELD_MISSING';

const missingVariable = (path: string, variables: string[]) => ({
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
    let error;
    if (typeof value === 'string') {
      // will always be true, but this keeps my doesContain var contained!
      if (!error) {
        const { doesContain } = containsChars(title)(value);
        if (!doesContain) {
          error = missingVariable(path, [title]);
        }
      }
      if (!error) {
        const { doesContain } = containsChars(description)(value);
        error = !doesContain ? missingVariable(path, [description]) : undefined;
      } else {
        const { doesContain } = containsChars(description)(value);
        error = !doesContain
          ? missingVariable(path, [title, description])
          : missingVariable(path, [title]);
      }
    }
    return error;
  };

export const containsExternalId =
  () =>
  (...args: Parameters<ValidationFunc>): ReturnType<ValidationFunc<any, ERROR_CODE>> => {
    const [{ value, path }] = args;

    const id = templateActionVariable(
      urlVars.find((actionVariable) => actionVariable.name === 'external.system.id')!
    );
    let error;
    if (typeof value === 'string') {
      const { doesContain } = containsChars(id)(value);
      if (!doesContain) {
        error = missingVariable(path, [id]);
      }
    }
    return error;
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
    const error = missingVariable(path, [id, title]);
    if (typeof value === 'string') {
      const { doesContain: doesContainId } = containsChars(id)(value);
      const { doesContain: doesContainTitle } = containsChars(title)(value);
      if (doesContainId || doesContainTitle) {
        return undefined;
      }
    }
    return error;
  };

export const containsIdOrEmpty =
  (message: string) =>
  (...args: Parameters<ValidationFunc>): ReturnType<ValidationFunc<any, ERROR_CODE>> => {
    const [{ value }] = args;
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
    return containsExternalId()(...args);
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
        error = missingVariable(path, [comment]);
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
