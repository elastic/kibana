/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { TransformGetTransformStatsTransformStats } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { usageTracker } from '../data_loaders/usage_tracker';
import { metadataCurrentIndexPattern } from '../constants';

export const waitForMetadataTransformsReady = usageTracker.track(
  'waitForMetadataTransformsReady',
  async (esClient: Client): Promise<void> => {
    await waitFor(() => areMetadataTransformsReady(esClient));
  }
);

export const stopMetadataTransforms = usageTracker.track(
  'stopMetadataTransforms',
  async (esClient: Client): Promise<void> => {
    const transformIds = await getMetadataTransformIds(esClient);
    await Promise.all(
      transformIds.map((transformId) =>
        esClient.transform.stopTransform({
          transform_id: transformId,
          force: true,
          wait_for_completion: true,
          allow_no_match: true,
        })
      )
    );
  }
);

export const startMetadataTransforms = usageTracker.track(
  'startMetadataTransforms',
  async (
    esClient: Client,
    // agentIds to wait for
    agentIds: string[]
  ): Promise<void> => {
    const transformIds = await getMetadataTransformIds(esClient);
    const currentTransformId = transformIds.find((transformId) => transformId.includes('current'));
    const unitedTransformId = transformIds.find((transformId) => transformId.includes('united'));
    if (!currentTransformId || !unitedTransformId) {
      // eslint-disable-next-line no-console
      console.warn('metadata transforms not found, skipping transform start');
      return;
    }

    try {
      await esClient.transform.startTransform({
        transform_id: currentTransformId,
      });
    } catch (err) {
      // ignore if transform already started
      if (err.statusCode !== 409) {
        throw err;
      }
    }

    await waitForCurrentMetdataDocs(esClient, agentIds);

    try {
      await esClient.transform.startTransform({
        transform_id: unitedTransformId,
      });
    } catch (err) {
      // ignore if transform already started
      if (err.statusCode !== 409) {
        throw err;
      }
    }
  }
);

async function getMetadataTransformStats(
  esClient: Client
): Promise<TransformGetTransformStatsTransformStats[]> {
  return (
    await esClient.transform.getTransformStats({
      transform_id: '*endpoint.metadata_*',
      allow_no_match: true,
    })
  ).transforms;
}

async function getMetadataTransformIds(esClient: Client): Promise<string[]> {
  return (await getMetadataTransformStats(esClient)).map((transform) => transform.id);
}

async function areMetadataTransformsReady(esClient: Client): Promise<boolean> {
  const transforms = await getMetadataTransformStats(esClient);
  return !transforms.some(
    // TODO TransformGetTransformStatsTransformStats type needs to be updated to include health
    (transform: TransformGetTransformStatsTransformStats & { health?: { status: string } }) =>
      transform?.health?.status !== 'green'
  );
}

async function waitForCurrentMetdataDocs(esClient: Client, agentIds: string[]) {
  const query = agentIds.length
    ? {
        bool: {
          filter: [
            {
              terms: {
                'agent.id': agentIds,
              },
            },
          ],
        },
      }
    : {
        match_all: {},
      };
  const size = agentIds.length ?? 1;
  await waitFor(
    async () =>
      (
        await esClient.search({
          index: metadataCurrentIndexPattern,
          query,
          size,
          rest_total_hits_as_int: true,
        })
      ).hits.total === size
  );
}

async function waitFor(
  cb: () => Promise<boolean>,
  interval: number = 20000,
  maxAttempts = 6
): Promise<void> {
  let attempts = 0;
  let isReady = false;

  while (!isReady) {
    await new Promise((res) => setTimeout(() => res(''), interval));
    isReady = await cb();
    attempts++;

    if (attempts > maxAttempts) {
      return;
    }
  }
}
