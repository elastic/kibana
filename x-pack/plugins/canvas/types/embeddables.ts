/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeRange } from '@kbn/es-query';
import { Filter } from '@kbn/es-query';
import { EmbeddableInput as Input } from '@kbn/embeddable-plugin/common';
import {
  HasAppContext,
  HasDisableTriggers,
  PublishesViewMode,
  PublishesUnifiedSearch,
} from '@kbn/presentation-publishing';
import { CanAddNewPanel, HasSerializedChildState } from '@kbn/presentation-containers';

export type EmbeddableInput = Input & {
  timeRange?: TimeRange;
  filters?: Filter[];
  savedObjectId?: string;
};

export type CanvasContainerApi = PublishesViewMode &
  CanAddNewPanel &
  HasDisableTriggers &
  HasSerializedChildState &
  Partial<HasAppContext & PublishesUnifiedSearch>;
