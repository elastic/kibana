/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';

/** Opaque handle returned from indexScenarioData, used to clean up in afterAll */
export interface ScenarioHandle {
  dataStream: string;
  docCount: number;
}

/**
 * Indexes a batch of synthetic log/trace documents into a data stream.
 * The data stream is created automatically if it does not exist.
 *
 * Documents must have `@timestamp` in ISO-8601 format.
 * All other fields are indexed as-is.
 */
export async function indexScenarioData(
  esClient: any,
  log: ToolingLog,
  params: {
    dataStream: string;
    documents: Array<Record<string, unknown>>;
  }
): Promise<ScenarioHandle> {
  const { dataStream, documents } = params;

  log.info(`Indexing ${documents.length} documents into ${dataStream}`);

  // Build bulk request body
  const body = documents.flatMap((doc) => [{ create: { _index: dataStream } }, doc]);

  const response = await esClient.bulk({ body, refresh: 'wait_for' });

  if (response.errors) {
    const failed = (response.items as any[]).filter((item: any) => item.create?.error);
    log.warning(`${failed.length} documents failed to index (out of ${documents.length})`);
    if (failed.length > 0) {
      log.debug(`First failure: ${JSON.stringify(failed[0]?.create?.error)}`);
    }
  } else {
    log.info(`Successfully indexed ${documents.length} documents into ${dataStream}`);
  }

  return { dataStream, docCount: documents.length };
}

/**
 * Deletes all documents that were indexed for a scenario.
 * Uses delete-by-query so it does not leave the index in a broken state.
 */
export async function cleanScenarioData(
  esClient: any,
  log: ToolingLog,
  handle: ScenarioHandle
): Promise<void> {
  if (!handle?.dataStream) return;

  log.debug(`Cleaning up data stream: ${handle.dataStream}`);

  try {
    await esClient.deleteByQuery({
      index: handle.dataStream,
      body: { query: { match_all: {} } },
      refresh: true,
    });
    log.debug(`Cleaned ${handle.dataStream}`);
  } catch (err: any) {
    // Index may not exist if setup failed — ignore
    if (err?.statusCode !== 404) {
      log.warning(`Failed to clean ${handle.dataStream}: ${err?.message}`);
    }
  }
}
