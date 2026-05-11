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
import type { KbnClient, UiSettingValues, UiSettingsPropagationDelayOptions } from '@kbn/test';
import type { StreamsSupertestRepositoryClient } from './repository_client';
import { deleteStream, getQueries, putStream } from './requests';

interface UpdateStreamsUiSettingsWithPropagationOptions<T> {
  kibanaServer: KbnClient;
  updates: UiSettingValues;
  description: string;
  assertion?: UiSettingsPropagationDelayOptions<T>['assertion'];
}

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

export const updateStreamsUiSettingsWithPropagation = async <T>({
  kibanaServer,
  updates,
  description,
  assertion,
}: UpdateStreamsUiSettingsWithPropagationOptions<T>) => {
  await kibanaServer.uiSettings.update(updates);

  return await kibanaServer.uiSettings.withPropagationDelay({
    description,
    assertion,
  });
};

export const updateSignificantEventsSettingWithPropagation = async ({
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
  await updateStreamsUiSettingsWithPropagation({
    kibanaServer,
    updates: {
      [OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS]: enabled,
      ...updates,
    },
    description: 'streams uiSettings propagation',
    assertion: async () => {
      const probeStreamName = `logs.otel.ui-settings-probe-${v4()}`;
      const queryId = `probe-query-${v4()}`;

      try {
        await putStream(
          apiClient,
          probeStreamName,
          createProbeStreamRequest(probeStreamName, queryId)
        );

        const { queries } = await getQueries(apiClient, probeStreamName);

        if (enabled) {
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
