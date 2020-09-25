/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';
import * as rt from 'io-ts';
import { npStart } from '../../../legacy_singletons';

import { getJobIdPrefix, jobCustomSettingsRT } from '../../../../common/infra_ml';
import { createPlainError, throwErrors } from '../../../../common/runtime_types';

export const callSetupMlModuleAPI = async (
  moduleId: string,
  start: number | undefined,
  end: number | undefined,
  spaceId: string,
  sourceId: string,
  indexPattern: string,
  jobOverrides: SetupMlModuleJobOverrides[] = [],
  datafeedOverrides: SetupMlModuleDatafeedOverrides[] = [],
  query?: object
) => {
  const response = await npStart.http.fetch(`/api/ml/modules/setup/${moduleId}`, {
    method: 'POST',
    body: JSON.stringify(
      setupMlModuleRequestPayloadRT.encode({
        start,
        end,
        indexPatternName: indexPattern,
        prefix: getJobIdPrefix(spaceId, sourceId),
        startDatafeed: true,
        jobOverrides,
        datafeedOverrides,
        query,
      })
    ),
  });

  return pipe(
    setupMlModuleResponsePayloadRT.decode(response),
    fold(throwErrors(createPlainError), identity)
  );
};

const setupMlModuleTimeParamsRT = rt.partial({
  start: rt.number,
  end: rt.number,
});

const setupMlModuleJobOverridesRT = rt.type({
  job_id: rt.string,
  custom_settings: jobCustomSettingsRT,
});

export type SetupMlModuleJobOverrides = rt.TypeOf<typeof setupMlModuleJobOverridesRT>;

const setupMlModuleDatafeedOverridesRT = rt.object;

export type SetupMlModuleDatafeedOverrides = rt.TypeOf<typeof setupMlModuleDatafeedOverridesRT>;

const setupMlModuleRequestParamsRT = rt.intersection([
  rt.strict({
    indexPatternName: rt.string,
    prefix: rt.string,
    startDatafeed: rt.boolean,
    jobOverrides: rt.array(setupMlModuleJobOverridesRT),
    datafeedOverrides: rt.array(setupMlModuleDatafeedOverridesRT),
  }),
  rt.exact(
    rt.partial({
      query: rt.object,
    })
  ),
]);

const setupMlModuleRequestPayloadRT = rt.intersection([
  setupMlModuleTimeParamsRT,
  setupMlModuleRequestParamsRT,
]);

const setupErrorResponseRT = rt.type({
  msg: rt.string,
});

const datafeedSetupResponseRT = rt.intersection([
  rt.type({
    id: rt.string,
    started: rt.boolean,
    success: rt.boolean,
  }),
  rt.partial({
    error: setupErrorResponseRT,
  }),
]);

const jobSetupResponseRT = rt.intersection([
  rt.type({
    id: rt.string,
    success: rt.boolean,
  }),
  rt.partial({
    error: setupErrorResponseRT,
  }),
]);

const setupMlModuleResponsePayloadRT = rt.type({
  datafeeds: rt.array(datafeedSetupResponseRT),
  jobs: rt.array(jobSetupResponseRT),
});

export type SetupMlModuleResponsePayload = rt.TypeOf<typeof setupMlModuleResponsePayloadRT>;
