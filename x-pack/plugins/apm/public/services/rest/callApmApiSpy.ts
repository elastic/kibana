/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as createCallApmApi from './createCallApmApi';
import type { AbstractAPMClient } from './createCallApmApi';

export type CallApmApiSpy = jest.SpyInstance<
  Promise<any>,
  Parameters<AbstractAPMClient>
>;

export type CreateCallApmApiSpy = jest.SpyInstance<AbstractAPMClient>;

export const getCreateCallApmApiSpy = () =>
  jest.spyOn(
    createCallApmApi,
    'createCallApmApi'
  ) as unknown as CreateCallApmApiSpy;
export const getCallApmApiSpy = () =>
  jest.spyOn(createCallApmApi, 'callApmApi') as unknown as CallApmApiSpy;
