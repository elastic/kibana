/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getExternalServiceSimulatorPath,
  getAllExternalServiceSimulatorPaths,
  ExternalServiceSimulator,
} from '@kbn/actions-simulators-plugin/server/plugin';
import { getServiceNowServer } from '@kbn/actions-simulators-plugin/server/plugin';
import { RecordingServiceNowSimulator } from '@kbn/actions-simulators-plugin/server/servicenow_simulation';
import {
  tinesAgentWebhook,
  tinesStory1,
} from '@kbn/actions-simulators-plugin/server/tines_simulation';

export interface ServiceNowRequest {
  work_notes?: string;
}

export {
  getExternalServiceSimulatorPath,
  getAllExternalServiceSimulatorPaths,
  ExternalServiceSimulator,
  getServiceNowServer,
  RecordingServiceNowSimulator,
  tinesAgentWebhook,
  tinesStory1,
};
