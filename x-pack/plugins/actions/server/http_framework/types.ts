/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { ObjectType } from '@kbn/config-schema';
import { LicenseType } from '../../../licensing/common/types';

interface EndPointConfig<
  Config extends Record<string, any> = Record<string, any>,
  Secrets extends Record<string, any> = Record<string, any>,
  Params extends Record<string, any> = Record<string, any>,
  FetchResponse extends Record<string, any> = Record<string, any>
> {
  method: 'get' | 'post' | 'put' | 'delete' | 'patch';
  responseSchema: ObjectType<FetchResponse>;
  getPath: (config: Config) => string;
  preFetch?: (params: Params) => void;
  /**
   * Is it possible to deduct the type of res from
   * responseSchema
   */
  postFetch?: (res: FetchResponse) => void;
}

type EndPointFunc = () => void;

type EndPoint<Config, Secrets, Params> = EndPointConfig<Config, Secrets, Params> | EndPointFunc;

export interface HTTPConnectorType<
  Config extends Record<string, any> = Record<string, any>,
  Secrets extends Record<string, any> = Record<string, any>,
  Params extends Record<string, any> = Record<string, any>
> {
  id: string;
  name: string;
  minimumLicenseRequired: LicenseType;
  schema: {
    config: ObjectType<Config>;
    secrets: ObjectType<Secrets>;
    params: ObjectType<Params>;
  };
  endpoints: Record<string, EndPoint<Config, Secrets, Params>>;
}
