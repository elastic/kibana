/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 } from 'uuid';
import expect from '@kbn/expect';
import { emptyAssets } from '@kbn/streams-schema';
import type { Streams } from '@kbn/streams-schema';
import { OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS } from '@kbn/management-settings-ids';
import type { KbnClient, UiSettingValues } from '@kbn/test';
import type { StreamsSupertestRepositoryClient } from './repository_client';
import { deleteStream, getQueries, putStream } from './requests';

const createProbeStreamRequest = (
  streamName: string,
  queryId: string
): Streams.WiredStream.UpsertRequest => ({
  ...emptyAssets,
  queries: [
    {
      id: queryId,
      type: 'match',
      title: 'probe query',
      description: '',
      esql: {
        query: `FROM ${streamName},${streamName}.* METADATA _id, _source | WHERE KQL("message:'ui-settings-probe'")`,
      },
    },
  ],
  stream: {
    type: 'wired',
    description: 'Probe stream for significant events uiSettings propagation',
    ingest: {
      lifecycle: { inherit: {} },
      processing: { steps: [] },
      settings: {},
      wired: {
        routing: [],
        fields: {},
      },
      failure_store: { inherit: {} },
    },
  },
});

export const updateStreamsUiSettingsAndWait = async ({
  kibanaServer,
  apiClient,
  updates,
  significantEventsEnabled,
}: {
  kibanaServer: KbnClient;
  apiClient: StreamsSupertestRepositoryClient;
  updates: UiSettingValues;
  significantEventsEnabled: boolean;
}) => {
  await kibanaServer.uiSettings.updateAndWait(updates, {
    description: 'streams uiSettings propagation',
    probe: async () => {
      const probeStreamName = `logs.otel.ui-settings-probe-${v4()}`;
      const queryId = `probe-query-${v4()}`;

      try {
        await putStream(
          apiClient,
          probeStreamName,
          createProbeStreamRequest(probeStreamName, queryId)
        );

        const { queries } = await getQueries(apiClient, probeStreamName);

        if (significantEventsEnabled) {
          expect(queries).to.have.length(1);
          expect(queries[0]).to.have.property('id', queryId);
        } else {
          expect(queries).to.eql([]);
        }
      } finally {
        await deleteStream(apiClient, probeStreamName).catch(() => undefined);
      }
    },
  });
};

export const updateSignificantEventsSettingAndWait = async ({
  kibanaServer,
  apiClient,
  enabled,
  updates = {},
}: {
  kibanaServer: KbnClient;
  apiClient: StreamsSupertestRepositoryClient;
  enabled: boolean;
  updates?: UiSettingValues;
}) => {
  await updateStreamsUiSettingsAndWait({
    kibanaServer,
    apiClient,
    updates: {
      [OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS]: enabled,
      ...updates,
    },
    significantEventsEnabled: enabled,
  });
};
