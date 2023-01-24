/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import type { HttpHandler } from '@kbn/core/public';

import { getJobIdPrefix, jobCustomSettingsRT } from '../../../../../common/log_analysis';
import { decodeOrThrow } from '../../../../../common/runtime_types';

interface RequestArgs {
  moduleId: string;
  start?: number;
  end?: number;
  spaceId: string;
  sourceId: string;
  indexPattern: string;
  jobOverrides?: SetupMlModuleJobOverrides[];
  datafeedOverrides?: SetupMlModuleDatafeedOverrides[];
  query?: object;
  useDedicatedIndex?: boolean;
}

export const callSetupMlModuleAPI = async (requestArgs: RequestArgs, fetch: HttpHandler) => {
  const {
    moduleId,
    start,
    end,
    spaceId,
    sourceId,
    indexPattern,
    jobOverrides = [],
    datafeedOverrides = [],
    query,
    useDedicatedIndex = false,
  } = requestArgs;

  const response = await fetch(`/api/ml/modules/setup/${moduleId}`, {
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
        useDedicatedIndex,
      })
    ),
  });

  return decodeOrThrow(setupMlModuleResponsePayloadRT)(response);
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
    useDedicatedIndex: rt.boolean,
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

const setupErrorRT = rt.type({
  reason: rt.string,
  type: rt.string,
});

const setupErrorResponseRT = rt.type({
  status: rt.number,
  error: rt.intersection([
    setupErrorRT,
    rt.type({
      root_cause: rt.array(setupErrorRT),
    }),
  ]),
});

const datafeedSetupResponseRT = rt.intersection([
  rt.type({
    id: rt.string,
    started: rt.boolean,
    success: rt.boolean,
  }),
  rt.partial({
    awaitingNodeAssignment: rt.boolean,
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
