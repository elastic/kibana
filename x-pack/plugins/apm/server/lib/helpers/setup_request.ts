/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable no-console */
import {
  AggregationSearchResponse,
  ESFilter,
  SearchParams
} from 'elasticsearch';
import { Legacy } from 'kibana';
import { cloneDeep, has, isString, set } from 'lodash';
import moment from 'moment';
import { OBSERVER_VERSION_MAJOR } from '../../../common/elasticsearch_fieldnames';

function decodeEsQuery(esQuery?: string) {
  return esQuery ? JSON.parse(decodeURIComponent(esQuery)) : null;
}

export interface APMSearchParams extends SearchParams {
  includeLegacyData?: boolean;
}

export type ESClient = <T = void, U = void>(
  type: string,
  params: APMSearchParams
) => Promise<AggregationSearchResponse<T, U>>;

export interface Setup {
  start: number;
  end: number;
  esFilterQuery?: ESFilter;
  client: ESClient;
  config: Legacy.KibanaConfig;
}

interface APMRequestQuery {
  _debug: string;
  start: string;
  end: string;
  esFilterQuery: string;
}

function getApmIndices(config: Legacy.KibanaConfig) {
  return [
    config.get<string>('apm_oss.errorIndices'),
    config.get<string>('apm_oss.metricsIndices'),
    config.get<string>('apm_oss.onboardingIndices'),
    config.get<string>('apm_oss.sourcemapIndices'),
    config.get<string>('apm_oss.spanIndices'),
    config.get<string>('apm_oss.transactionIndices')
  ];
}

export function isApmIndex(
  apmIndices: string[],
  indexParam: SearchParams['index']
) {
  if (isString(indexParam)) {
    return apmIndices.includes(indexParam);
  } else if (Array.isArray(indexParam)) {
    // return false if at least one of the indices is not an APM index
    return indexParam.every(index => apmIndices.includes(index));
  }
  return false;
}

function addFilterForLegacyData(
  apmIndices: string[],
  { includeLegacyData = false, ...params }: APMSearchParams
): SearchParams {
  // search across all data (including data)
  if (includeLegacyData || !isApmIndex(apmIndices, params.index)) {
    return params;
  }

  const nextParams = cloneDeep(params);
  if (!has(nextParams, 'body.query.bool.filter')) {
    set(nextParams, 'body.query.bool.filter', []);
  }

  // add filter for omitting pre-7.x data
  nextParams.body.query.bool.filter.push({
    range: { [OBSERVER_VERSION_MAJOR]: { gte: 7 } }
  });

  return nextParams;
}

export function setupRequest(req: Legacy.Request): Setup {
  const query = (req.query as unknown) as APMRequestQuery;
  const cluster = req.server.plugins.elasticsearch.getCluster('data');
  const uiSettings = req.getUiSettingsService();
  const config = req.server.config();
  const apmIndices = getApmIndices(config);

  const client: ESClient = async (type, params) => {
    const includeFrozen = await uiSettings.get('search:includeFrozen');

    const nextParams = {
      ...addFilterForLegacyData(apmIndices, params), // filter out pre-7.0 data
      ignore_throttled: !includeFrozen, // whether to query frozen indices or not
      rest_total_hits_as_int: true // ensure that ES returns accurate hits.total with pre-6.6 format
    };

    if (query._debug) {
      console.log(`DEBUG ES QUERY:`);
      console.log('includeFrozen: ', includeFrozen);
      console.log(
        `${req.method.toUpperCase()} ${req.url.pathname} ${JSON.stringify(
          query
        )}`
      );
      console.log(`GET ${nextParams.index}/_search`);
      console.log(JSON.stringify(nextParams.body, null, 4));
    }

    return cluster.callWithRequest(req, type, nextParams);
  };

  return {
    start: moment.utc(query.start).valueOf(),
    end: moment.utc(query.end).valueOf(),
    esFilterQuery: decodeEsQuery(query.esFilterQuery),
    client,
    config
  };
}
