/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { Logger, LegacyScopedClusterClient } from 'src/core/server';
import { SearchResponse } from 'elasticsearch';
import { EsQueryAlertParams } from './alert_type_params';
import { shimHitsTotal } from '../../../../../../src/plugins/data/server';
import { parseDuration } from '../../../../alerts/server';

export interface ExecuteEsQueryAlertParams extends EsQueryAlertParams {
  date: number;
}

export interface ExecuteEsQueryParameters {
  logger: Logger;
  callCluster: LegacyScopedClusterClient['callAsCurrentUser'];
  query: ExecuteEsQueryAlertParams;
}

export async function executeEsQuery(params: ExecuteEsQueryParameters): Promise<number> {
  const { logger, callCluster, query: queryParams } = params;
  const { index, timeField, esQuery, timeWindowSize, timeWindowUnit, date } = queryParams;

  let parsedQuery;
  try {
    parsedQuery = JSON.parse(esQuery);
  } catch (err) {
    throw new Error(getInvalidQueryError(esQuery));
  }

  const window = `${timeWindowSize}${timeWindowUnit}`;
  let timeWindow: number;
  try {
    timeWindow = parseDuration(window);
  } catch (err) {
    throw new Error(getInvalidWindowSizeError(window));
  }

  const dateStart = new Date(date - timeWindow).toISOString();
  const dateEnd = new Date(date).toISOString();

  // construct the query
  const esQueryToExecute = {
    index,
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            {
              range: {
                [timeField]: {
                  gte: dateStart,
                  lt: dateEnd,
                  format: 'strict_date_time',
                },
              },
            },
            parsedQuery.query,
          ],
        },
      },
    },
    track_total_hits: true,
    ignoreUnavailable: true,
    allowNoIndices: true,
    ignore: [404],
  };

  logger.info(JSON.stringify(esQueryToExecute));
  let numMatches = 0;
  const logPrefix = 'esQuery callCluster';
  logger.debug(`${logPrefix} call: ${JSON.stringify(esQueryToExecute)}`);

  try {
    const esResult: SearchResponse<unknown> = await callCluster('search', esQueryToExecute);

    // Needed until https://github.com/elastic/kibana/issues/26356 is resolved
    const shimmedEsResult = shimHitsTotal(esResult);
    logger.info(JSON.stringify(shimmedEsResult));
    numMatches = shimmedEsResult.hits.total;
  } catch (err) {
    logger.warn(`${logPrefix} error: ${err.message}`);
  }

  return numMatches;
}

function getInvalidWindowSizeError(windowValue: string) {
  return i18n.translate('xpack.stackAlerts.esQuery.invalidWindowSizeErrorMessage', {
    defaultMessage: 'invalid format for windowSize: "{windowValue}"',
    values: {
      windowValue,
    },
  });
}

function getInvalidQueryError(query: string) {
  return i18n.translate('xpack.stackAlerts.esQuery.invalidQueryErrorMessage', {
    defaultMessage: 'invalid query specified: "{query}" - query must be JSON',
    values: {
      query,
    },
  });
}
