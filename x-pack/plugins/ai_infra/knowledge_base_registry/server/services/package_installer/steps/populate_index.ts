/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkRequest } from '@elastic/elasticsearch/lib/api/types';
import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { ZipArchive } from '../utils/zip_archive';

// TODO: factorize with utils/validate_artifact_archive
const contentFileRegexp = /^content\/content-[0-9]+\.ndjson$/;

export const populateIndex = async ({
  esClient,
  indexName,
  archive,
  log,
}: {
  esClient: ElasticsearchClient;
  indexName: string;
  archive: ZipArchive;
  log: Logger;
}) => {
  log.debug(`Starting populating index ${indexName}`);

  const contentEntries = archive
    .getEntryPaths()
    .filter((entryPath) => contentFileRegexp.test(entryPath));

  for (let i = 0; i < contentEntries.length; i++) {
    const entryPath = contentEntries[i];
    log.debug(`Indexing content for entry ${entryPath}`);
    const contentBuffer = await archive.getEntryContent(entryPath);
    await indexContentFile({ indexName, esClient, contentBuffer });
  }

  log.debug(`Done populating index ${indexName}`);
};

const indexContentFile = async ({
  indexName,
  contentBuffer,
  esClient,
}: {
  indexName: string;
  contentBuffer: Buffer;
  esClient: ElasticsearchClient;
}) => {
  const fileContent = contentBuffer.toString('utf-8');
  const lines = fileContent.split('\n');

  const documents = lines
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      return JSON.parse(line);
    })
    .map((doc) => rewriteInferenceId(doc, 'default-elser'));

  const operations = documents.reduce((ops, document) => {
    ops!.push(...[{ index: { _index: indexName } }, document]);
    return ops;
  }, [] as BulkRequest['operations']);

  const response = await esClient.bulk({
    refresh: false,
    operations,
  });

  if (response.errors) {
    const error = response.items.find((item) => item.index!.error)!.index!.error!;
    throw new Error(`Error indexing documents: ${JSON.stringify(error)}`);
  }
};

// TODO: extract / do it right.
const rewriteInferenceId = (document: Record<string, any>, inferenceId: string) => {
  document.ai_questions_answered.inference.inference_id = inferenceId;
  document.ai_subtitle.inference.inference_id = inferenceId;
  document.ai_summary.inference.inference_id = inferenceId;
  document.content_body.inference.inference_id = inferenceId;
  return document;
};
