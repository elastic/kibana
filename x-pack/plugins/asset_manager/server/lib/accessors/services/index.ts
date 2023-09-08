/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AccessorOptions, OptionsWithInjectedValues } from '..';

export interface GetServicesOptions extends AccessorOptions {
  from: string;
  to: string;
  parent?: string;
}
export type GetServicesOptionsInjected = OptionsWithInjectedValues<GetServicesOptions>;

export interface ServiceIdentifier {
  'asset.ean': string;
  'asset.id': string;
  'asset.name'?: string;
  'service.environment'?: string;
}
