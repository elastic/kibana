/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import {
  CUSTOM_CONTEXT_API_PATH,
  type GetCustomContextResponse,
  type PutCustomContextRequest,
} from '@kbn/nightshift-investigations-plugin/common';

/**
 * The custom context the customer0 deployment's Nightshift space carries, so graded customer0
 * investigations run with the same user-provided nudges as production.
 */
export const CUSTOMER0_CUSTOM_CONTEXT: readonly string[] = [
  "Source code: when Kibana or Elasticsearch behavior is involved, establish the timeline from telemetry first, then read the relevant code before concluding, even if the cause already seems clear. The repos are public: github.com/elastic/kibana and github.com/elastic/elasticsearch (shallow blobless clone in the sandbox; find files with `git ls-tree`/`git grep`, don't guess paths).",
];

/**
 * The custom context snippets an investigation dataset runs with. Stored datasets are not named
 * `nightshift/customer0…`, so they are recognized by their `customer0` tag.
 */
export const getDatasetCustomContext = ({
  name,
  tags = [],
}: {
  name: string;
  tags?: readonly string[];
}): readonly string[] =>
  name.startsWith('nightshift/customer0') || tags.includes('customer0')
    ? CUSTOMER0_CUSTOM_CONTEXT
    : [];

/** Replaces the space's custom context with exactly these snippets. */
export const replaceCustomContext = async (
  fetch: HttpHandler,
  snippets: readonly string[]
): Promise<void> => {
  const current = await fetch<GetCustomContextResponse>(CUSTOM_CONTEXT_API_PATH);
  if (snippets.length === 0 && current.snippets.length === 0) return;
  const body: PutCustomContextRequest = {
    snippets: snippets.map((text) => ({ text })),
    version: current.version,
  };
  await fetch(CUSTOM_CONTEXT_API_PATH, { method: 'PUT', body: JSON.stringify(body) });
};
