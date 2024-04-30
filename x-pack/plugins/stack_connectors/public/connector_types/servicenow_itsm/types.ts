/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExecutorSubActionPushParamsITSM } from '../../../server/connector_types/lib/servicenow/types';

export enum EventAction {
  TRIGGER = 'trigger',
  RESOLVE = 'resolve',
}

export interface ServiceNowITSMActionParams {
  subAction: string;
  subActionParams: ExecutorSubActionPushParamsITSM;
}
