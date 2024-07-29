/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { tasksRT } from '../../detections/types';
import { recommendationRT } from '../types';

export const applyRecommendationRequestParamsRT = rt.type({
  recommendationId: rt.string,
});

export const applyRecommendationRequestPayloadRT = rt.type({
  dataStream: rt.string,
  tasks: tasksRT,
});

export const applyRecommendationResponsePayloadRT = rt.type({
  recommendation: recommendationRT,
});

export type ApplyRecommendationRequestParams = rt.TypeOf<typeof applyRecommendationRequestParamsRT>;

export type ApplyRecommendationRequestPayload = rt.TypeOf<
  typeof applyRecommendationRequestPayloadRT
>;

export type ApplyRecommendationResponsePayload = rt.TypeOf<
  typeof applyRecommendationResponsePayloadRT
>;
