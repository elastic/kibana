/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';

export const aiopsExplainLogRateSpikesSchema = schema.object({
  /** The index to query for log rate spikes */
  index: schema.string(),
});

export type AiopsExplainLogRateSpikesSchema = TypeOf<typeof aiopsExplainLogRateSpikesSchema>;

export const API_ACTION_NAME = {
  UPDATE_LOADING_STATE: 'update_loading_state',
} as const;
export type ApiActionName = typeof API_ACTION_NAME[keyof typeof API_ACTION_NAME];

interface ApiActionUpdateLoadingState {
  type: typeof API_ACTION_NAME.UPDATE_LOADING_STATE;
  payload: {
    ccsWarning: boolean;
    loaded: number;
    loadingState: string;
  };
}

export function updateLoadingStateAction(
  payload: ApiActionUpdateLoadingState['payload']
): ApiActionUpdateLoadingState {
  return {
    type: API_ACTION_NAME.UPDATE_LOADING_STATE,
    payload,
  };
}

export type AiopsExplainLogRateSpikesApiAction = ApiActionUpdateLoadingState;
