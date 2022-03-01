/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KueryNode } from '@kbn/es-query';
import { CASE_USER_ACTION_SAVED_OBJECT } from '../../../common/constants';
import { buildFilter } from '../../client/utils';
import { CasesTelemetry, CollectTelemetryDataParams } from '../types';
import { getConnectorsCardinalityAggregationQuery } from './utils';

export const getConnectorsTelemetryData = async ({
  savedObjectsClient,
}: CollectTelemetryDataParams): Promise<CasesTelemetry['connectors']> => {
  const getData = async (filter?: KueryNode) => {
    const res = await savedObjectsClient.find<
      unknown,
      { references: { connectors: { uniqueConnectors: { value: number } } } }
    >({
      page: 0,
      perPage: 0,
      filter,
      type: CASE_USER_ACTION_SAVED_OBJECT,
      aggs: {
        ...getConnectorsCardinalityAggregationQuery(),
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

    const res = await getData(connectorFilter);

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
    getData(),
    ...connectorTypes.map((connectorType) => getConnectorData(connectorType)),
  ]);

  const connectorData = all.slice(1);
  const data = connectorData.reduce(
    (acc, res, currentIndex) => ({
      ...acc,
      [connectorTypes[currentIndex]]:
        res.aggregations?.references?.connectors?.uniqueConnectors?.value ?? 0,
    }),
    {} as Record<typeof connectorTypes[number], number>
  );

  const allAttached = all[0].aggregations?.references?.connectors?.uniqueConnectors?.value ?? 0;

  return {
    all: { totalAttached: allAttached },
    itsm: { totalAttached: data['.servicenow'] },
    sir: { totalAttached: data['.servicenow-sir'] },
    jira: { totalAttached: data['.jira'] },
    resilient: { totalAttached: data['.resilient'] },
    swimlane: { totalAttached: data['.swimlane'] },
    maxAttachedToACase: 0,
  };
};
