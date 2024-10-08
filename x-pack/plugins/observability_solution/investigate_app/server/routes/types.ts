/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreStart,
  CustomRequestHandlerContext,
  IScopedClusterClient,
  IUiSettingsClient,
  KibanaRequest,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { LicensingApiRequestHandlerContext } from '@kbn/licensing-plugin/server';
import type { InvestigateAppSetupDependencies, InvestigateAppStartDependencies } from '../types';

export type InvestigateAppRequestHandlerContext = Omit<
  CustomRequestHandlerContext<{}>,
  'core' | 'resolve'
> & {
  core: Promise<{
    elasticsearch: {
      client: IScopedClusterClient;
    };
    uiSettings: {
      client: IUiSettingsClient;
      globalClient: IUiSettingsClient;
    };
    savedObjects: {
      client: SavedObjectsClientContract;
    };
    coreStart: CoreStart;
  }>;
  licensing: Promise<LicensingApiRequestHandlerContext>;
};

export interface InvestigateAppRouteHandlerResources {
  request: KibanaRequest;
  context: InvestigateAppRequestHandlerContext;
  logger: Logger;
  plugins: {
    [key in keyof InvestigateAppSetupDependencies]: {
      setup: Required<InvestigateAppSetupDependencies>[key];
    };
  } & {
    [key in keyof InvestigateAppStartDependencies]: {
      start: () => Promise<Required<InvestigateAppStartDependencies>[key]>;
    };
  };
}

export interface InvestigateAppRouteCreateOptions {
  options: {
    timeout?: {
      idleSocket?: number;
    };
    tags: [];
  };
}
