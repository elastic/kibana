/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { recommendationRT } from '../types';

export const getRecommendationsRequestQueryRT = rt.type({
  dataStream: rt.string,
});

export const getRecommendationsResponsePayloadRT = rt.type({
  recommendations: rt.array(recommendationRT),
});

export type GetRecommendationsRequestQuery = rt.TypeOf<typeof getRecommendationsRequestQueryRT>;

export type GetRecommendationsResponsePayload = rt.TypeOf<
  typeof getRecommendationsResponsePayloadRT
>;
