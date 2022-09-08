/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  INGEST_PIPELINE_CREATION_ERROR_MESSAGE,
  INGEST_PIPELINE_DELETION_ERROR_MESSAGE,
} from './translations';
import type { CreateIngestPipeline, DeleteIngestPipeline } from './types';

const INGEST_PIPELINES_API_BASE_PATH = `/api/ingest_pipelines`;

export async function createIngestPipeline({
  http,
  notifications,
  signal,
  errorMessage,
  options,
}: CreateIngestPipeline) {
  const res = await http
    .post(INGEST_PIPELINES_API_BASE_PATH, {
      body: JSON.stringify(options),
      signal,
    })
    .catch((e) => {
      notifications?.toasts?.addDanger({
        title: errorMessage ?? INGEST_PIPELINE_CREATION_ERROR_MESSAGE,
        text: e?.body?.message,
      });
    });

  return res;
}

export async function deleteIngestPipelines({
  http,
  notifications,
  signal,
  errorMessage,
  names, // separate with ','
}: DeleteIngestPipeline) {
  const count = names.split(',').length;
  const res = await http
    .delete(`${INGEST_PIPELINES_API_BASE_PATH}/${names}`, {
      signal,
    })
    .catch((e) => {
      notifications?.toasts?.addDanger({
        title: errorMessage ?? INGEST_PIPELINE_DELETION_ERROR_MESSAGE(count),
        text: e?.body?.message,
      });
    });

  return res;
}
