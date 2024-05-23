/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  CoreSetup,
  CoreStart,
  KibanaRequest,
  KibanaResponseFactory,
  Logger,
} from '@kbn/core/server';
import { ObservabilityOnboardingServerRouteRepository } from '.';
import { ObservabilityOnboardingConfig } from '..';
import { EsLegacyConfigService } from '../services/es_legacy_config_service';
import {
  ObservabilityOnboardingPluginSetupDependencies,
  ObservabilityOnboardingPluginStartDependencies,
  ObservabilityOnboardingRequestHandlerContext,
} from '../types';

export type { ObservabilityOnboardingServerRouteRepository };

export interface ObservabilityOnboardingRouteHandlerResources {
  context: ObservabilityOnboardingRequestHandlerContext;
  logger: Logger;
  request: KibanaRequest;
  response: KibanaResponseFactory;
  plugins: {
    [key in keyof ObservabilityOnboardingPluginSetupDependencies]: {
      setup: Required<ObservabilityOnboardingPluginSetupDependencies>[key];
      start: () => Promise<Required<ObservabilityOnboardingPluginStartDependencies>[key]>;
    };
  };
  core: {
    setup: CoreSetup;
    start: () => Promise<CoreStart>;
  };
  config: ObservabilityOnboardingConfig;
  kibanaVersion: string;
  services: {
    esLegacyConfigService: EsLegacyConfigService;
  };
}

export interface ObservabilityOnboardingRouteCreateOptions {
  options: {
    tags: string[];
    xsrfRequired?: boolean;
  };
}
