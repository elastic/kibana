/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import type { HttpSetup } from 'src/core/public';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';
import * as rt from 'io-ts';

import { jobCustomSettingsRT } from '../../../../../common/log_analysis';
import { createPlainError, throwErrors } from '../../../../../common/runtime_types';

export const callGetMlModuleAPI = async (moduleId: string, fetch: HttpSetup['fetch']) => {
  const response = await fetch(`/api/ml/modules/get_module/${moduleId}`, {
    method: 'GET',
  });

  return pipe(
    getMlModuleResponsePayloadRT.decode(response),
    fold(throwErrors(createPlainError), identity)
  );
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
