/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AxiosResponse } from 'axios';

/**
 * Create an Axios response object mock
 *
 * @param data
 * @param status
 * @param statusText
 */
export const createAxiosResponseMock = <R>(
  data: R,
  status = 200,
  statusText = 'ok'
): AxiosResponse<R> => {
  return {
    data,
    status,
    statusText,
    headers: {},
    // @ts-expect-error
    config: {},
  };
};
