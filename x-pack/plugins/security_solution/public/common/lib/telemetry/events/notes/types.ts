/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema } from '@kbn/core/public';
import type { TelemetryEventTypes } from '../../constants';

export interface OpenNoteInExpandableFlyoutClickedParams {
  location: string;
}

export interface AddNoteFromExpandableFlyoutClickedParams {
  isRelatedToATimeline: boolean;
}

export type NotesTelemetryEventParams =
  | OpenNoteInExpandableFlyoutClickedParams
  | AddNoteFromExpandableFlyoutClickedParams;

export type NotesTelemetryEvents =
  | {
      eventType: TelemetryEventTypes.OpenNoteInExpandableFlyoutClicked;
      schema: RootSchema<OpenNoteInExpandableFlyoutClickedParams>;
    }
  | {
      eventType: TelemetryEventTypes.AddNoteFromExpandableFlyoutClicked;
      schema: RootSchema<AddNoteFromExpandableFlyoutClickedParams>;
    };
