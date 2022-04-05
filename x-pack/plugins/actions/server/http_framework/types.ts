/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { AxiosBasicCredentials } from 'axios';
import type { Type } from '@kbn/config-schema';
import type { LicenseType } from '../../../licensing/common/types';

interface EndPointConfig<
  Config extends Record<string, any> = Record<string, any>,
  Secrets extends Record<string, any> = Record<string, any>,
  Params extends Record<string, any> = Record<string, any>,
  FetchResponse extends Record<string, any> = Record<string, any>
> {
  method: 'get' | 'post' | 'put' | 'delete' | 'patch';
  responseSchema: Type<FetchResponse>;
  getPath: (config: Config) => string;
  getAuth: (secrets: Secrets) => AxiosBasicCredentials;
  preFetch?: (params: Params) => void;
  /**
   * Is it possible to deduct the type of res from
   * responseSchema
   */
  postFetch?: (res: FetchResponse) => void;
}

export type EndPointFunc = () => Promise<{}>;

export type EndPoint<Config, Secrets, Params> =
  | EndPointConfig<Config, Secrets, Params>
  | EndPointFunc;

export interface HTTPConnectorType<
  Config extends Record<string, any> = Record<string, any>,
  Secrets extends Record<string, any> = Record<string, any>,
  Params extends Record<string, any> = Record<string, any>
> {
  id: string;
  name: string;
  minimumLicenseRequired: LicenseType;
  schema: {
    config: Type<Config>;
    secrets: Type<Secrets>;
    params: Type<Params>;
  };
  endpoints: Record<string, EndPoint<Config, Secrets, Params>>;
}

export type HandlerReturnType = Record<string, unknown> | Array<Record<string, unknown>>;
export type HandlerFunc = () => Promise<HandlerReturnType>;
