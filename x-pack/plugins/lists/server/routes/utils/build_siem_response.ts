/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CustomHttpResponseOptions, KibanaResponseFactory } from '@kbn/core/server';

/**
 * Copied from x-pack/plugins/security_solution/server/lib/detection_engine/routes/utils.ts
 * We cannot put this in kbn package just yet as the types from 'src/core/server' aren't a kbn package yet and this would pull in a lot of copied things.
 * TODO: Once more types are moved into kbn package we can move this into a kbn package.
 */
const statusToErrorMessage = (
  statusCode: number
):
  | 'Bad Request'
  | 'Unauthorized'
  | 'Forbidden'
  | 'Not Found'
  | 'Conflict'
  | 'Internal Error'
  | '(unknown error)' => {
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

/**
 * Copied from x-pack/plugins/security_solution/server/lib/detection_engine/routes/utils.ts
 * We cannot put this in kbn package just yet as the types from 'src/core/server' aren't a kbn package yet and this would pull in a lot of copied things.
 * TODO: Once more types are moved into kbn package we can move this into a kbn package.
 */
export class SiemResponseFactory {
  constructor(private response: KibanaResponseFactory) {}

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  error<T>({ statusCode, body, headers }: CustomHttpResponseOptions<T>) {
    // KibanaResponse is not exported so we cannot use a return type here and that is why the linter is turned off above
    const contentType: CustomHttpResponseOptions<T>['headers'] = {
      'content-type': 'application/json',
    };
    const defaultedHeaders: CustomHttpResponseOptions<T>['headers'] = {
      ...contentType,
      ...(headers ?? {}),
    };

    return this.response.custom({
      body: Buffer.from(
        JSON.stringify({
          message: body ?? statusToErrorMessage(statusCode),
          status_code: statusCode,
        })
      ),
      headers: defaultedHeaders,
      statusCode,
    });
  }
}

/**
 * Copied from x-pack/plugins/security_solution/server/lib/detection_engine/routes/utils.ts
 * We cannot put this in kbn package just yet as the types from 'src/core/server' aren't a kbn package yet and this would pull in a lot of copied things.
 * TODO: Once more types are moved into kbn package we can move this into a kbn package.
 */
export const buildSiemResponse = (response: KibanaResponseFactory): SiemResponseFactory =>
  new SiemResponseFactory(response);
