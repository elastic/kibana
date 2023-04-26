/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { KibanaRequest, Logger } from '@kbn/core/server';
import { ObservabilityOnboardingServerRouteRepository } from '.';
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
  plugins: {
    [key in keyof ObservabilityOnboardingPluginSetupDependencies]: {
      setup: Required<ObservabilityOnboardingPluginSetupDependencies>[key];
      start: () => Promise<
        Required<ObservabilityOnboardingPluginStartDependencies>[key]
      >;
    };
  };
}

export interface ObservabilityOnboardingRouteCreateOptions {
  options: {
    tags: string[];
  };
}
