/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { badRequestErrorRT, forbiddenErrorRT, routeTimingMetadataRT } from '../shared';
import { logSourceConfigurationRT } from '../../log_sources/log_source_configuration';

/**
 * request
 */

export const getLogSourceConfigurationRequestParamsRT = rt.type({
  // the id of the source configuration
  sourceId: rt.string,
});

export type GetLogSourceConfigurationRequestParams = rt.TypeOf<
  typeof getLogSourceConfigurationRequestParamsRT
>;

/**
 * response
 */

export const getLogSourceConfigurationSuccessResponsePayloadRT = rt.intersection([
  rt.type({
    data: logSourceConfigurationRT,
  }),
  rt.partial({
    timing: routeTimingMetadataRT,
  }),
]);

export type GetLogSourceConfigurationSuccessResponsePayload = rt.TypeOf<
  typeof getLogSourceConfigurationSuccessResponsePayloadRT
>;

export const getLogSourceConfigurationErrorResponsePayloadRT = rt.union([
  badRequestErrorRT,
  forbiddenErrorRT,
]);

export type GetLogSourceConfigurationErrorReponsePayload = rt.TypeOf<
  typeof getLogSourceConfigurationErrorResponsePayloadRT
>;

export const getLogSourceConfigurationResponsePayloadRT = rt.union([
  getLogSourceConfigurationSuccessResponsePayloadRT,
  getLogSourceConfigurationErrorResponsePayloadRT,
]);

export type GetLogSourceConfigurationReponsePayload = rt.TypeOf<
  typeof getLogSourceConfigurationResponsePayloadRT
>;
