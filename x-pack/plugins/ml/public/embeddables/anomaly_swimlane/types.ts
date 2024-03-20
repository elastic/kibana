/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HasType, PublishingSubject } from '@kbn/presentation-publishing';
import type { SwimlaneType } from '../../application/explorer/explorer_constants';
import type { JobId } from '../../shared';
import type { AnomalySwimLaneEmbeddableType } from '../constants';
import type { AnomalySwimlaneEmbeddableUserInput, MlEmbeddableBaseApi } from '../types';

export interface AnomalySwimLaneComponentApi {
  jobIds: JobId[];
  swimlaneType: PublishingSubject<SwimlaneType>;
  viewBy: PublishingSubject<string>;
  perPage: PublishingSubject<number>;
  fromPage: PublishingSubject<number>;
  updateUserInput: (input: AnomalySwimlaneEmbeddableUserInput) => void;
}

export type AnomalySwimLaneEmbeddableApi = HasType<AnomalySwimLaneEmbeddableType> &
  MlEmbeddableBaseApi &
  AnomalySwimLaneComponentApi;
