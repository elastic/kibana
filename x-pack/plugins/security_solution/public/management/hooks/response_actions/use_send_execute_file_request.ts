/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseMutationOptions, UseMutationResult } from '@tanstack/react-query';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { useMutation } from '@tanstack/react-query';
import type { ResponseActionApiResponse } from '../../../../common/endpoint/types';
import { KibanaServices } from '../../../common/lib/kibana';
import type { BaseActionRequestSchema } from '../../../../common/endpoint/schema/actions';

export const useSendExecuteFileRequest = (
  customOptions?: UseMutationOptions<
    ResponseActionApiResponse,
    IHttpFetchError,
    typeof BaseActionRequestSchema & { file: File }
  >
): UseMutationResult<
  ResponseActionApiResponse,
  IHttpFetchError,
  typeof BaseActionRequestSchema & { file: File }
> => {
  return useMutation<
    ResponseActionApiResponse,
    IHttpFetchError,
    typeof BaseActionRequestSchema & { file: File }
  >(({ file, ...otherParams }) => {
    const formData = new FormData();
    formData.append('file', file, file.name);

    for (const [name, value] of Object.entries(otherParams)) {
      formData.append(name, typeof value !== 'string' ? JSON.stringify(value) : value);
    }

    return KibanaServices.get().http.post<ResponseActionApiResponse>(
      '/api/endpoint/action/execute_file',
      {
        body: formData,
        headers: {
          'Content-Type': undefined,
        },
      }
    );
  }, customOptions);
};
