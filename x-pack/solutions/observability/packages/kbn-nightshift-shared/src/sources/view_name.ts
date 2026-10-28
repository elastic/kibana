/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toSlugIdentifier } from '@kbn/std';

/**
 * Every Nightshift source is materialised as an ES|QL view under this prefix. The `$.`
 * namespace is the one Streams already uses for its views, so index wildcards such as
 * `FROM logs*` never match a source view by accident. After the prefix: `<spaceId>.<slug>`.
 * The space id is how admins (and implicit privileges) grant `$.nightshift.sources.<spaceId>.*`
 * instead of every source on the cluster. The slug is derived from the title at create
 * time, not the saved-object id, so views stay readable in the ES|QL editor.
 */
export const NIGHTSHIFT_SOURCE_VIEW_PREFIX = '$.nightshift.sources.';

export const MAX_SOURCE_SLUG_LENGTH = 64;
/** Kibana does not cap space ids; this is the view-name bound so the ES identifier stays finite. */
export const MAX_SOURCE_SPACE_ID_LENGTH = 256;
export const MAX_SOURCE_VIEW_NAME_LENGTH =
  NIGHTSHIFT_SOURCE_VIEW_PREFIX.length + MAX_SOURCE_SPACE_ID_LENGTH + 1 + MAX_SOURCE_SLUG_LENGTH;
const MAX_SOURCE_SLUG_BASE_LENGTH = 48;
const FALLBACK_SOURCE_SLUG = 'source';

export const getNightshiftSourceViewName = (spaceId: string, slug: string): string =>
  `${NIGHTSHIFT_SOURCE_VIEW_PREFIX}${spaceId}.${slug}`;

/** Lowercased kebab of the title; punctuation-only titles become `source`. */
export const getSourceSlugFromTitle = (title: string): string => {
  const slug = toSlugIdentifier(title).slice(0, MAX_SOURCE_SLUG_BASE_LENGTH).replace(/-+$/, '');
  return slug || FALLBACK_SOURCE_SLUG;
};

/**
 * First attempt is the title slug. Later attempts append `-2`, `-3`, … so two
 * "Nginx errors" sources in the same space can coexist without putting a source
 * id in the view name.
 */
export const getSourceSlugCandidate = (title: string, attempt: number): string => {
  const base = getSourceSlugFromTitle(title);
  if (attempt <= 1) {
    return base;
  }
  const suffix = `-${attempt}`;
  const trimmed = base.slice(0, MAX_SOURCE_SLUG_LENGTH - suffix.length).replace(/-+$/, '');
  return `${trimmed || FALLBACK_SOURCE_SLUG}${suffix}`;
};
