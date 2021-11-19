/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecuritySolutionFactory } from '../../types';
import {
  CtiThreatIntelSourceStrategyResponse,
  CtiQueries,
  CtiThreatIntelSourceRequestOptions,
} from '../../../../../../common';
import { IEsSearchResponse } from '../../../../../../../../../src/plugins/data/common';
// import { inspectStringifyObject } from '../../../../../utils/build_query';
import { buildThreatIntelSourceQuery } from './query.threat_intel_source.dsl';

export const threatIntelSource: SecuritySolutionFactory<CtiQueries.threatIntelSource> = {
  buildDsl: (options: CtiThreatIntelSourceRequestOptions) => buildThreatIntelSourceQuery(options),
  parse: async (
    options: CtiThreatIntelSourceRequestOptions,
    response: IEsSearchResponse<unknown>
  ): Promise<CtiThreatIntelSourceStrategyResponse> => {
    // const inspect = {
    //   dsl: [inspectStringifyObject(buildThreatIntelSourceQuery(options))],
    // };

    return {
      ...response,
      //   inspect,
    };
  },
};
