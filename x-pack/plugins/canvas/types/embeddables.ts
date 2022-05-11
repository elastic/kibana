/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimeRange } from '@kbn/data-plugin/public';
import { Filter } from '@kbn/es-query';
import { EmbeddableInput as Input } from '@kbn/embeddable-plugin/common';

export type EmbeddableInput = Input & {
  timeRange?: TimeRange;
  filters?: Filter[];
  savedObjectId?: string;
};
