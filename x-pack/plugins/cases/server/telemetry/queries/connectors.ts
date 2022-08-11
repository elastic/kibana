/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AggregationsAggregationContainer } from '@elastic/elasticsearch/lib/api/types';
import { KueryNode } from '@kbn/es-query';
import { SavedObjectsFindResponse } from '@kbn/core/server';
import { CASE_USER_ACTION_SAVED_OBJECT } from '../../../common/constants';
import { buildFilter } from '../../client/utils';
import {
  CasesTelemetry,
  CollectTelemetryDataParams,
  MaxBucketOnCaseAggregation,
  ReferencesAggregation,
} from '../types';
import {
  getConnectorsCardinalityAggregationQuery,
  getMaxBucketOnCaseAggregationQuery,
  getOnlyConnectorsFilter,
} from './utils';

export const getConnectorsTelemetryData = async ({
  savedObjectsClient,
}: CollectTelemetryDataParams): Promise<CasesTelemetry['connectors']> => {
  const getData = async <A>({
    filter,
    aggs,
  }: {
    filter?: KueryNode;
    aggs?: Record<string, AggregationsAggregationContainer>;
  } = {}) => {
    const res = await savedObjectsClient.find<unknown, A>({
      page: 0,
      perPage: 0,
      filter,
      type: CASE_USER_ACTION_SAVED_OBJECT,
      aggs: {
        ...aggs,
      },
    });

    return res;
  };

  const getConnectorData = async (connectorType: string) => {
    const connectorFilter = buildFilter({
      filters: [connectorType],
      field: 'payload.connector.type',
      operator: 'or',
      type: CASE_USER_ACTION_SAVED_OBJECT,
    });

    const res = await getData<ReferencesAggregation>({
      filter: connectorFilter,
      aggs: getConnectorsCardinalityAggregationQuery(),
    });

    return res;
  };

  const connectorTypes = [
    '.servicenow',
    '.servicenow-sir',
    '.jira',
    '.resilient',
    '.swimlane',
  ] as const;

  const all = await Promise.all([
    getData<ReferencesAggregation>({ aggs: getConnectorsCardinalityAggregationQuery() }),
    getData<MaxBucketOnCaseAggregation>({
      filter: getOnlyConnectorsFilter(),
      aggs: getMaxBucketOnCaseAggregationQuery(CASE_USER_ACTION_SAVED_OBJECT),
    }),
    ...connectorTypes.map((connectorType) => getConnectorData(connectorType)),
  ]);

  const connectorData = all.slice(2) as Array<
    SavedObjectsFindResponse<unknown, ReferencesAggregation>
  >;

  const data = connectorData.reduce(
    (acc, res, currentIndex) => ({
      ...acc,
      [connectorTypes[currentIndex]]:
        res.aggregations?.references?.referenceType?.referenceAgg?.value ?? 0,
    }),
    {} as Record<typeof connectorTypes[number], number>
  );

  const allAttached = all[0].aggregations?.references?.referenceType?.referenceAgg?.value ?? 0;
  const maxAttachedToACase = all[1].aggregations?.references?.cases?.max?.value ?? 0;

  return {
    all: {
      all: { totalAttached: allAttached },
      itsm: { totalAttached: data['.servicenow'] },
      sir: { totalAttached: data['.servicenow-sir'] },
      jira: { totalAttached: data['.jira'] },
      resilient: { totalAttached: data['.resilient'] },
      swimlane: { totalAttached: data['.swimlane'] },
      /**
       * This metric is not 100% accurate. To get this metric we
       * we do a term aggregation based on the the case reference id.
       * Each bucket corresponds to a case and contains the total user actions
       * of type connector. Then from all buckets we take the maximum bucket.
       * A user actions of type connectors will be created if the connector is attached
       * to a case or the user updates the fields of the connector. This metric
       * contains also the updates on the fields of the connector. Ideally we would
       * like to filter for unique connector ids on each bucket.
       */
      maxAttachedToACase,
    },
  };
};
