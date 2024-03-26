/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MlEntityField } from '@kbn/ml-anomaly-utils';
import type { HasType, PublishingSubject } from '@kbn/presentation-publishing';
import type { JobId } from '../../shared';
import type { AnomalyExplorerChartsEmbeddableType } from '../constants';
import type { MlEmbeddableBaseApi } from '../types';

export interface AnomalyChartsFieldSelectionApi {
  jobIds: PublishingSubject<JobId[]>;
  entityFields: PublishingSubject<MlEntityField[] | undefined>;
}

export interface AnomalyChartsEmbeddableApi
  extends HasType<AnomalyExplorerChartsEmbeddableType>,
    MlEmbeddableBaseApi,
    AnomalyChartsFieldSelectionApi {}
