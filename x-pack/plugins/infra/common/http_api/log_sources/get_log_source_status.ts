/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';
import { routeTimingMetadataRT } from '../shared';
import {
  getLogSourceConfigurationPath,
  LOG_SOURCE_CONFIGURATION_PATH,
} from './log_source_configuration';

export const LOG_SOURCE_STATUS_PATH_SUFFIX = 'status';
export const LOG_SOURCE_STATUS_PATH = `${LOG_SOURCE_CONFIGURATION_PATH}/${LOG_SOURCE_STATUS_PATH_SUFFIX}`;
export const getLogSourceStatusPath = (sourceId: string) =>
  `${getLogSourceConfigurationPath(sourceId)}/${LOG_SOURCE_STATUS_PATH_SUFFIX}`;

/**
 * request
 */

export const getLogSourceStatusRequestParamsRT = rt.type({
  // the id of the source configuration
  sourceId: rt.string,
});

export type GetLogSourceStatusRequestParams = rt.TypeOf<typeof getLogSourceStatusRequestParamsRT>;

/**
 * response
 */

const logIndexFieldRT = rt.strict({
  name: rt.string,
  type: rt.string,
  searchable: rt.boolean,
  aggregatable: rt.boolean,
});

export type LogIndexField = rt.TypeOf<typeof logIndexFieldRT>;

const logSourceStatusRT = rt.strict({
  logIndexFields: rt.array(logIndexFieldRT),
  logIndicesExist: rt.boolean,
});

export type LogSourceStatus = rt.TypeOf<typeof logSourceStatusRT>;

export const getLogSourceStatusSuccessResponsePayloadRT = rt.intersection([
  rt.type({
    data: logSourceStatusRT,
  }),
  rt.partial({
    timing: routeTimingMetadataRT,
  }),
]);

export type GetLogSourceStatusSuccessResponsePayload = rt.TypeOf<
  typeof getLogSourceStatusSuccessResponsePayloadRT
>;
