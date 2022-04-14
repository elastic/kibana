/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';

import type { IEsSearchResponse } from '../../../../../../../../src/plugins/data/common';
import {
  FactoryQueryTypes,
  MatrixHistogramRequestOptions,
  MatrixHistogramStrategyResponse,
  MatrixHistogramQuery,
  MatrixHistogramType,
  MatrixHistogramDataConfig,
} from '../../../../../common/search_strategy/security_solution';
import { inspectStringifyObject } from '../../../../utils/build_query';
import { SecuritySolutionFactory } from '../types';
import { getGenericData } from './helpers';
import { alertsMatrixHistogramConfig } from './alerts';
import { anomaliesMatrixHistogramConfig } from './anomalies';
import { authenticationsMatrixHistogramConfig } from './authentications';
import { dnsMatrixHistogramConfig } from './dns';
import { eventsMatrixHistogramConfig } from './events';
import { previewMatrixHistogramConfig } from './preview';

const matrixHistogramConfig: MatrixHistogramDataConfig = {
  [MatrixHistogramType.alerts]: alertsMatrixHistogramConfig,
  [MatrixHistogramType.anomalies]: anomaliesMatrixHistogramConfig,
  [MatrixHistogramType.authentications]: authenticationsMatrixHistogramConfig,
  [MatrixHistogramType.dns]: dnsMatrixHistogramConfig,
  [MatrixHistogramType.events]: eventsMatrixHistogramConfig,
  [MatrixHistogramType.preview]: previewMatrixHistogramConfig,
};

export const matrixHistogram: SecuritySolutionFactory<typeof MatrixHistogramQuery> = {
  buildDsl: (options: MatrixHistogramRequestOptions) => {
    const myConfig = getOr(null, options.histogramType, matrixHistogramConfig);
    if (myConfig == null) {
      throw new Error(`This histogram type ${options.histogramType} is unknown to the server side`);
    }
    return myConfig.buildDsl(options);
  },
  parse: async (
    options: MatrixHistogramRequestOptions,
    response: IEsSearchResponse<unknown>
  ): Promise<MatrixHistogramStrategyResponse> => {
    const myConfig = getOr(null, options.histogramType, matrixHistogramConfig);
    if (myConfig == null) {
      throw new Error(`This histogram type ${options.histogramType} is unknown to the server side`);
    }
    const totalCount = response.rawResponse.hits.total || 0;
    const matrixHistogramData = getOr([], myConfig.aggName, response.rawResponse);
    const inspect = {
      dsl: [inspectStringifyObject(myConfig.buildDsl(options))],
    };
    const dataParser = myConfig.parser ?? getGenericData;

    return {
      ...response,
      inspect,
      matrixHistogramData: dataParser<typeof options.histogramType>(
        matrixHistogramData,
        myConfig.parseKey
      ),
      // @ts-expect-error code doesn't handle TotalHits
      totalCount,
    };
  },
};

export const matrixHistogramEntities: SecuritySolutionFactory<typeof MatrixHistogramQuery> = {
  buildDsl: (options: MatrixHistogramRequestOptions) => {
    const myConfig = getOr(null, options.histogramType, matrixHistogramConfig);
    if (myConfig == null) {
      throw new Error(`This histogram type ${options.histogramType} is unknown to the server side`);
    }
    return myConfig.buildDsl(options);
  },
  parse: async (
    options: MatrixHistogramRequestOptions,
    response: IEsSearchResponse<unknown>
  ): Promise<MatrixHistogramStrategyResponse> => {
    const myConfig = getOr(null, options.histogramType, matrixHistogramConfig);
    if (myConfig == null) {
      throw new Error(`This histogram type ${options.histogramType} is unknown to the server side`);
    }
    const totalCount = response.rawResponse.hits.total || 0;
    const matrixHistogramData = getOr([], myConfig.aggName, response.rawResponse);
    const inspect = {
      dsl: [inspectStringifyObject(myConfig.buildDsl(options))],
    };
    const dataParser = myConfig.parser ?? getGenericData;

    return {
      ...response,
      inspect,
      matrixHistogramData: dataParser<typeof options.histogramType>(
        matrixHistogramData,
        myConfig.parseKey
      ),
      // @ts-expect-error code doesn't handle TotalHits
      totalCount,
    };
  },
};

export const matrixHistogramFactory: Record<
  typeof MatrixHistogramQuery,
  SecuritySolutionFactory<FactoryQueryTypes>
> = {
  [MatrixHistogramQuery]: matrixHistogram,
};
