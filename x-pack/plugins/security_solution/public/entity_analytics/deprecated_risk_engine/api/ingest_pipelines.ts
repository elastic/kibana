/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toMountPoint } from '@kbn/react-kibana-mount';
import {
  INGEST_PIPELINE_CREATION_ERROR_MESSAGE,
  INGEST_PIPELINE_DELETION_ERROR_MESSAGE,
} from './translations';
import type { CreateIngestPipeline, DeleteIngestPipeline } from './types';

const INGEST_PIPELINES_API_BASE_PATH = `/api/ingest_pipelines`;

export async function createIngestPipeline({
  errorMessage,
  http,
  options,
  renderDocLink,
  signal,
  startServices: { notifications, ...startServices },
}: CreateIngestPipeline) {
  const res = await http
    .post(INGEST_PIPELINES_API_BASE_PATH, {
      body: JSON.stringify(options),
      signal,
    })
    .catch((e) => {
      notifications.toasts.addDanger({
        title: errorMessage ?? INGEST_PIPELINE_CREATION_ERROR_MESSAGE,
        text: toMountPoint(
          renderDocLink ? renderDocLink(e?.body?.message) : e?.body?.message,
          startServices
        ),
      });
    });

  return res;
}

export async function deleteIngestPipelines({
  errorMessage,
  http,
  names, // separate with ','
  renderDocLink,
  signal,
  startServices: { notifications, ...startServices },
}: DeleteIngestPipeline) {
  const count = names.split(',').length;
  const res = await http
    .delete(`${INGEST_PIPELINES_API_BASE_PATH}/${names}`, {
      signal,
    })
    .catch((e) => {
      notifications.toasts.addDanger({
        title: errorMessage ?? INGEST_PIPELINE_DELETION_ERROR_MESSAGE(count),
        text: toMountPoint(
          renderDocLink ? renderDocLink(e?.body?.message) : e?.body?.message,
          startServices
        ),
      });
    });

  return res;
}
