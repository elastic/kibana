/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MlEntityField } from '@kbn/ml-anomaly-utils';
import type { PublishingSubject } from '@kbn/presentation-publishing';
import type { JobId } from '../../../common/types/anomaly_detection_jobs';
import type { MlEmbeddableBaseApi } from '../types';

export interface AnomalyChartsFieldSelectionApi {
  jobIds: PublishingSubject<JobId[]>;
  entityFields: PublishingSubject<MlEntityField[] | undefined>;
}

export interface AnomalyChartsEmbeddableApi
  extends MlEmbeddableBaseApi,
    AnomalyChartsFieldSelectionApi {}
