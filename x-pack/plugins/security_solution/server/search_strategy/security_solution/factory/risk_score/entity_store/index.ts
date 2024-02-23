/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { IEsSearchResponse } from '@kbn/data-plugin/common';
import { inspectStringifyObject } from '../../../../../utils/build_query';
import { buildRiskScoreQuery } from './query.risk_score.dsl';

export const entityStore = {
  buildDsl: (options: any) => buildRiskScoreQuery(options),
  parse: async (options: any, response: IEsSearchResponse) => ({
    ...response,
    response: response.rawResponse,
    inspect: {
      dsl: [inspectStringifyObject(buildRiskScoreQuery(options))],
    },
  }),
};
