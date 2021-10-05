/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { badRequestErrorRT, forbiddenErrorRT } from '../shared';
import { getLogSourceConfigurationSuccessResponsePayloadRT } from './get_log_source_configuration';
import { logSourceConfigurationPropertiesRT } from '../../log_sources/log_source_configuration';

/**
 * request
 */

export const patchLogSourceConfigurationRequestParamsRT = rt.type({
  // the id of the source configuration
  sourceId: rt.string,
});

export type PatchLogSourceConfigurationRequestParams = rt.TypeOf<
  typeof patchLogSourceConfigurationRequestParamsRT
>;

const logSourceConfigurationProperiesPatchRT = rt.partial({
  ...logSourceConfigurationPropertiesRT.type.props,
  fields: rt.partial(logSourceConfigurationPropertiesRT.type.props.fields.type.props),
});

export type LogSourceConfigurationPropertiesPatch = rt.TypeOf<
  typeof logSourceConfigurationProperiesPatchRT
>;

export const patchLogSourceConfigurationRequestBodyRT = rt.type({
  data: logSourceConfigurationProperiesPatchRT,
});

export type PatchLogSourceConfigurationRequestBody = rt.TypeOf<
  typeof patchLogSourceConfigurationRequestBodyRT
>;

/**
 * response
 */

export const patchLogSourceConfigurationSuccessResponsePayloadRT =
  getLogSourceConfigurationSuccessResponsePayloadRT;

export type PatchLogSourceConfigurationSuccessResponsePayload = rt.TypeOf<
  typeof patchLogSourceConfigurationSuccessResponsePayloadRT
>;

export const patchLogSourceConfigurationResponsePayloadRT = rt.union([
  patchLogSourceConfigurationSuccessResponsePayloadRT,
  badRequestErrorRT,
  forbiddenErrorRT,
]);

export type PatchLogSourceConfigurationReponsePayload = rt.TypeOf<
  typeof patchLogSourceConfigurationResponsePayloadRT
>;
