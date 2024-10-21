/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ValidationError,
  ValidationFunc,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { ERROR_CODE } from '@kbn/es-ui-shared-plugin/static/forms/helpers/field_validators/types';
import { isUrl } from '@kbn/es-ui-shared-plugin/static/validators/string';

const TorqWebhookEndpoint =
  (message: string) =>
  (...args: Parameters<ValidationFunc>): ReturnType<ValidationFunc<any, ERROR_CODE>> => {
    const [{ value }] = args as Array<{ value: string }>;
    const error: ValidationError<ERROR_CODE> = {
      code: 'ERR_FIELD_FORMAT',
      formatType: 'URL',
      message,
    };
    if (!isUrl(value)) return error;
    const hostname = new URL(value).hostname;
    const isTorqHostname = /^hooks(\.[a-z0-9]+)*\.torq\.io$/.test(hostname);
    return isTorqHostname ? undefined : error;
  };

// eslint-disable-next-line import/no-default-export
export { TorqWebhookEndpoint as default };
