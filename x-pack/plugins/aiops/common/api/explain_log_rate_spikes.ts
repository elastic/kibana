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
  ADD_FIELDS: 'add_fields',
} as const;
export type ApiActionName = typeof API_ACTION_NAME[keyof typeof API_ACTION_NAME];

interface ApiActionAddFields {
  type: typeof API_ACTION_NAME.ADD_FIELDS;
  payload: string[];
}

export function addFieldsAction(payload: string[]): ApiActionAddFields {
  return {
    type: API_ACTION_NAME.ADD_FIELDS,
    payload,
  };
}

export type AiopsExplainLogRateSpikesApiAction = ApiActionAddFields;
