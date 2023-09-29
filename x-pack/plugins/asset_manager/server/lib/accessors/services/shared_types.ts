/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GetServicesOptionsPublic } from '../../../../common/types_client';
import {
  AssetClientDependencies,
  AssetClientOptionsWithInjectedValues,
} from '../../asset_client_types';

export type GetServicesOptions = GetServicesOptionsPublic & AssetClientDependencies;
export type GetServicesOptionsInjected = AssetClientOptionsWithInjectedValues<GetServicesOptions>;
