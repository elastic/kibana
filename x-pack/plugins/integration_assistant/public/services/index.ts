/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { IntegrationAssistantPluginStartDependencies } from '../types';
import type { TelemetryService } from './telemetry/service';

export { Telemetry } from './telemetry/service';

export type Services = CoreStart &
  IntegrationAssistantPluginStartDependencies & { telemetry: TelemetryService };
