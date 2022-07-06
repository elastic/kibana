/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  ObservabilityPublicSetup,
  ObservabilityPublicStart,
} from '@kbn/observability-plugin/public';

export interface ProfilingPluginPublicSetupDeps {
  observability: ObservabilityPublicSetup;
}

export interface ProfilingPluginPublicStartDeps {
  observability: ObservabilityPublicStart;
}
