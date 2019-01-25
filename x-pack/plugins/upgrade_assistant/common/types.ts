/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';

export const UPGRADE_ASSISTANT_TYPE = 'upgrade-assistant-telemetry';
export const UPGRADE_ASSISTANT_DOC_ID = 'upgrade-assistant-telemetry';
export type UIOpenOption = 'overview' | 'cluster' | 'indices';

export interface UIOpen {
  overview: boolean;
  cluster: boolean;
  indices: boolean;
}

export interface UpgradeAssistantTelemetryServer extends Legacy.Server {
  usage: {
    collectorSet: {
      makeUsageCollector: any;
      register: any;
    };
  };
}

export interface UpgradeAssistantTelemetrySavedObject {
  ui_open: {
    overview: number;
    cluster: number;
    indices: number;
  };
}

export interface UpgradeAssistantTelemetry {
  ui_open: {
    overview: number;
    cluster: number;
    indices: number;
  };
  features: {
    deprecation_logging: {
      enabled: boolean;
    };
  };
}

export interface UpgradeAssistantTelemetrySavedObjectAttributes {
  [key: string]: any;
}
