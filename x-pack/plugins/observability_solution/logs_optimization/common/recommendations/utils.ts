/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidv4 } from 'uuid';
import { Detection } from '../detections/types';
import { Recommendation } from './types';

export const createRecommendation = (detection: Detection): Recommendation => ({
  id: uuidv4(),
  type: detection.type,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  status: 'pending',
  detection,
});
