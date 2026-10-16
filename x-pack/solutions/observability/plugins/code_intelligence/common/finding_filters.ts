/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Review states of a finding. Extraction writes `open`; a reviewer or the AI Agent moves it
 * to `verified` (a real exposure) or `invalid` (a false alarm). Re-extraction keeps the state.
 */
export const FINDING_STATUSES = ['open', 'verified', 'invalid'] as const;
export type FindingStatus = (typeof FINDING_STATUSES)[number];

/** Finding types the classifiers may file; documents with other types are legacy and hidden. */
export const FINDING_TYPES = ['sensitive-data'] as const;
export type FindingType = (typeof FINDING_TYPES)[number];

/** Most repositories one findings request may filter on. */
export const MAX_FINDING_REPOSITORY_FILTERS = 100;

/** Longest note a reviewer or the AI Agent may attach to a status change. */
export const MAX_FINDING_REVIEW_NOTE_LENGTH = 1000;

export const isFindingStatus = (value: unknown): value is FindingStatus =>
  typeof value === 'string' && (FINDING_STATUSES as readonly string[]).includes(value);
