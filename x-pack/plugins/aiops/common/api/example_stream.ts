/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';

export const aiopsExampleStreamSchema = schema.object({
  /** Boolean flag to enable/disabling simulation of response errors. */
  simulateErrors: schema.maybe(schema.boolean()),
  /** Maximum timeout between streaming messages. */
  timeout: schema.maybe(schema.number()),
});

export type AiopsExampleStreamSchema = TypeOf<typeof aiopsExampleStreamSchema>;

export const API_ACTION_NAME = {
  UPDATE_PROGRESS: 'update_progress',
  ADD_TO_ENTITY: 'add_to_entity',
  DELETE_ENTITY: 'delete_entity',
} as const;
export type ApiActionName = typeof API_ACTION_NAME[keyof typeof API_ACTION_NAME];

interface ApiActionUpdateProgress {
  type: typeof API_ACTION_NAME.UPDATE_PROGRESS;
  payload: number;
}

export function updateProgressAction(payload: number): ApiActionUpdateProgress {
  return {
    type: API_ACTION_NAME.UPDATE_PROGRESS,
    payload,
  };
}

interface ApiActionAddToEntity {
  type: typeof API_ACTION_NAME.ADD_TO_ENTITY;
  payload: {
    entity: string;
    value: number;
  };
}

export function addToEntityAction(entity: string, value: number): ApiActionAddToEntity {
  return {
    type: API_ACTION_NAME.ADD_TO_ENTITY,
    payload: {
      entity,
      value,
    },
  };
}

interface ApiActionDeleteEntity {
  type: typeof API_ACTION_NAME.DELETE_ENTITY;
  payload: string;
}

export function deleteEntityAction(payload: string): ApiActionDeleteEntity {
  return {
    type: API_ACTION_NAME.DELETE_ENTITY,
    payload,
  };
}

export type AiopsExampleStreamApiAction =
  | ApiActionUpdateProgress
  | ApiActionAddToEntity
  | ApiActionDeleteEntity;
