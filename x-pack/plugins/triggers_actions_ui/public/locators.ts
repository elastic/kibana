/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

import { LocatorPublic } from '@kbn/share-plugin/common';
import type { KibanaLocation, LocatorDefinition } from '@kbn/share-plugin/public';
import { SerializableRecord } from '@kbn/utility-types';
import { CASES_MANAGEMENT_LOCATOR, CONNECTORS_MANAGEMENT_LOCATOR } from '../common/constants';

export type CasesManagementLocator = LocatorPublic<CasesManagementLocatorParams>;

export interface CasesManagementLocatorParams extends SerializableRecord {} // eslint-disable-line @typescript-eslint/no-empty-interface

export class CasesManagementLocatorDefinition
  implements LocatorDefinition<CasesManagementLocatorParams>
{
  public readonly id = CASES_MANAGEMENT_LOCATOR;

  public readonly getLocation = async (
    _params: CasesManagementLocatorParams
  ): Promise<KibanaLocation> => {
    return {
      app: 'management',
      path: '/insightsAndAlerting/cases',
      state: {},
    };
  };
}

export interface ConnectorsManagementLocatorParams extends SerializableRecord {} // eslint-disable-line @typescript-eslint/no-empty-interface

export class ConnectorsManagementLocatorDefinition
  implements LocatorDefinition<ConnectorsManagementLocatorParams>
{
  public readonly id = CONNECTORS_MANAGEMENT_LOCATOR;

  public readonly getLocation = async (
    _params: ConnectorsManagementLocatorParams
  ): Promise<KibanaLocation> => {
    return {
      app: 'management',
      path: '/insightsAndAlerting/triggersActionsConnectors/connectors',
      state: {},
    };
  };
}
