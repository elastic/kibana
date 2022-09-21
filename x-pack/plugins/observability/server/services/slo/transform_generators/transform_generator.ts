/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { SLO } from '../../../types/models';

export interface TransformGenerator {
  getTransformParams(slo: SLO, spaceId: string): TransformPutTransformRequest;
}
