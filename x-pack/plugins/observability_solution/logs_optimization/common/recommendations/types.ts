/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { detectionRT } from '../detections/types';

export const recommendationStatusRT = rt.keyof({
  pending: null,
  resolved: null,
  rejected: null,
});

export const recommendationTypeRT = rt.keyof({
  field_extraction: null,
  mapping_gap: null,
  json_parsing: null,
});

export const recommendationRT = rt.type({
  id: rt.string,
  type: recommendationTypeRT,
  status: recommendationStatusRT,
  created_at: rt.string,
  updated_at: rt.string,
  detection: detectionRT,
});

export type Recommendation = rt.TypeOf<typeof recommendationRT>;
