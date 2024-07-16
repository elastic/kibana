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
  /* We override "additional_fields" to string because when users fill in the form, the structure won't match until done and
  we need to store the current state. To match with the data structure define in the backend, we make sure users can't
  send the form while not matching the original object structure. */
  subActionParams: ExecutorSubActionPushParamsITSM & {
    incident: { additional_fields: string | null };
  };
}
