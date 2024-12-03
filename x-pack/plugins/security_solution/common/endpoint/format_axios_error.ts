/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AxiosError } from 'axios';
import { EndpointError } from './errors';

/* eslint-disable @typescript-eslint/no-explicit-any */

export class FormattedAxiosError extends EndpointError {
  public readonly request: {
    method: string;
    url: string;
    data: unknown;
  };
  public readonly response: {
    status: number;
    statusText: string;
    data: any;
  };

  constructor(axiosError: AxiosError) {
    const method = axiosError.config?.method ?? '';
    const url = axiosError.config?.url ?? '';

    super(
      `${axiosError.message}${
        axiosError?.response?.data ? `: ${JSON.stringify(axiosError?.response?.data)}` : ''
      }${url ? `\n(Request: ${method} ${url})` : ''}`,
      axiosError
    );

    this.request = {
      method,
      url,
      data: axiosError.config?.data ?? '',
    };

    this.response = {
      status: axiosError?.response?.status ?? 0,
      statusText: axiosError?.response?.statusText ?? '',
      data: axiosError?.response?.data,
    };

    this.name = this.constructor.name;
  }

  toJSON() {
    return {
      message: this.message,
      request: this.request,
      response: this.response,
    };
  }

  toString() {
    return JSON.stringify(this.toJSON(), null, 2);
  }
}

/**
 * Used with `promise.catch()`, it will format the Axios error to a new error and will re-throw
 * @param error
 */
export const catchAxiosErrorFormatAndThrow = (error: Error): never => {
  if (error instanceof AxiosError) {
    throw new FormattedAxiosError(error);
  }

  throw error;
};
