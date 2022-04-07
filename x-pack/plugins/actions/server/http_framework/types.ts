/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Type } from '@kbn/config-schema';
import type { LicenseType } from '../../../licensing/common/types';
import { CaseConnector } from '../connectors/case';

// TODO: Fix types
export type IService = new (...args: any[]) => CaseConnector<unknown>;

interface SubAction {
  name: string;
  method: string;
}

export interface HTTPConnectorType<
  Config extends Record<string, any> = Record<string, any>,
  Secrets extends Record<string, any> = Record<string, any>
> {
  id: string;
  name: string;
  minimumLicenseRequired: LicenseType;
  schema: {
    config: Type<Config>;
    secrets: Type<Secrets>;
  };
  subActions: SubAction[];
  Service: IService;
}
