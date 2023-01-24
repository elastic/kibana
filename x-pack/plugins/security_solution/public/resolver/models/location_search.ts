/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PanelViewAndParameters } from '../types';
import * as schema from './schema';

/**
 * Validates an `unknown` value, narrowing it to `PanelViewAndParameters`.
 * Use this to validate that the value decoded from the URL is a valid `PanelViewAndParameters` object.
 */
export const isPanelViewAndParameters: (value: unknown) => value is PanelViewAndParameters =
  schema.oneOf([
    schema.object({
      panelView: schema.literal('nodes' as const),
    }),
    schema.object({
      panelView: schema.literal('nodeDetail' as const),
      panelParameters: schema.object({
        nodeID: schema.string(),
      }),
    }),
    schema.object({
      panelView: schema.literal('nodeEvents' as const),
      panelParameters: schema.object({
        nodeID: schema.string(),
      }),
    }),
    schema.object({
      panelView: schema.literal('nodeEventsInCategory' as const),
      panelParameters: schema.object({
        nodeID: schema.string(),
        eventCategory: schema.string(),
      }),
    }),
    schema.object({
      panelView: schema.literal('eventDetail' as const),
      panelParameters: schema.object({
        nodeID: schema.string(),
        eventCategory: schema.string(),
        eventID: schema.oneOf([schema.string(), schema.literal(undefined), schema.number()]),
        eventTimestamp: schema.string(),
        winlogRecordID: schema.string(),
      }),
    }),
  ]);
