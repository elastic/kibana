/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import type { HttpHandler } from '@kbn/core/public';

import { jobCustomSettingsRT } from '../../../../../common/log_analysis';
import { decodeOrThrow } from '../../../../../common/runtime_types';

export const callGetMlModuleAPI = async (moduleId: string, fetch: HttpHandler) => {
  const response = await fetch(`/api/ml/modules/get_module/${moduleId}`, {
    method: 'GET',
  });

  return decodeOrThrow(getMlModuleResponsePayloadRT)(response);
};

const jobDefinitionRT = rt.type({
  id: rt.string,
  config: rt.type({
    custom_settings: jobCustomSettingsRT,
  }),
});

export type JobDefinition = rt.TypeOf<typeof jobDefinitionRT>;

const getMlModuleResponsePayloadRT = rt.type({
  id: rt.string,
  jobs: rt.array(jobDefinitionRT),
});

export type GetMlModuleResponsePayload = rt.TypeOf<typeof getMlModuleResponsePayloadRT>;
