/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GetHostsOptionsPublic } from '../../../../common/types_client';
import { AccessorOptions, OptionsWithInjectedValues } from '..';

export type GetHostsOptions = GetHostsOptionsPublic & AccessorOptions;
export type GetHostsOptionsInjected = OptionsWithInjectedValues<GetHostsOptions>;

export interface HostIdentifier {
  'asset.ean': string;
  'asset.id': string;
  'asset.name'?: string;
}
