/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { NightshiftSource } from '@kbn/nightshift-shared';

/** Creates a catalog source and its ES|QL view for an evaluation dataset. */
export const createEvalSource = async ({
  fetch,
  title,
  esql,
}: {
  fetch: HttpHandler;
  title: string;
  esql: string;
}): Promise<NightshiftSource> => {
  const { source } = await fetch<{ source: NightshiftSource }>('/internal/nightshift/sources', {
    method: 'POST',
    body: JSON.stringify({ title, esql }),
  });
  return source;
};

/** Removes the source and its view after the evaluation completes. */
export const deleteEvalSource = async ({
  fetch,
  source,
}: {
  fetch: HttpHandler;
  source: NightshiftSource;
}): Promise<void> => {
  await fetch(`/internal/nightshift/sources/${source.id}`, { method: 'DELETE' });
};
