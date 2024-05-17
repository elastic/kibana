/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EmbeddableInput as Input } from '@kbn/embeddable-plugin/common';
import type { TimeRange } from '@kbn/es-query';
import { Filter } from '@kbn/es-query';
import { CanAddNewPanel } from '@kbn/presentation-containers';
import { PublishesViewMode } from '@kbn/presentation-publishing';

export type EmbeddableInput = Input & {
  timeRange?: TimeRange;
  filters?: Filter[];
  savedObjectId?: string;
};

export type CanvasContainerApi = PublishesViewMode & CanAddNewPanel;
