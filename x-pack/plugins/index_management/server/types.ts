/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { LegacyScopedClusterClient, IRouter } from 'src/core/server';
import { LicensingPluginSetup } from '../../licensing/server';
import { SecurityPluginSetup } from '../../security/server';
import { License, IndexDataEnricher } from './services';
import { isEsError } from './shared_imports';

export interface Dependencies {
  security: SecurityPluginSetup;
  licensing: LicensingPluginSetup;
}

export interface RouteDependencies {
  router: IRouter;
  license: License;
  config: {
    isSecurityEnabled: () => boolean;
  };
  indexDataEnricher: IndexDataEnricher;
  lib: {
    isEsError: typeof isEsError;
  };
}

export interface Index {
  health: string;
  status: string;
  name: string;
  uuid: string;
  primary: string;
  replica: string;
  documents: any;
  size: any;
  isFrozen: boolean;
  aliases: string | string[];
  data_stream?: string;
  [key: string]: any;
}

export type CallAsCurrentUser = LegacyScopedClusterClient['callAsCurrentUser'];
