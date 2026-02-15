/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';

/**
 * 🛠️ UTILITIES
 *
 * Shared constants and utility functions used across the workflow.
 */

export const SERVICES_INDEX = '.apm-service-map-workflow-services';
export const EDGES_INDEX = '.apm-service-map-workflow-edges';
export const METADATA_DOC_ID = '_workflow-metadata';
export const RESOLUTION_BATCH_SIZE = 2000;
export const MAX_TERMS_PER_QUERY = 10000;
export const MAX_CONCURRENT_BATCHES = 3;
export const MAX_RESOLUTION_ATTEMPTS = 10;

/**
 * Builds a deterministic document ID for service map edges using SHA-256 hashing.
 *
 * This ensures unique IDs even when source/destination values contain special characters
 * that would otherwise collide after escaping (e.g., "a.b/c" vs "a/b.c").
 *
 * Includes environment and agent in the hash to distinguish edges from the same service
 * to the same destination but in different environments or with different agents.
 *
 * Format: {prefix}-{hash}
 * Where hash is the first 16 characters of SHA-256(service + environment + agent + destination)
 *
 * @param prefix - Edge type prefix (e.g., "exit", "link")
 * @param sourceService - Source service name
 * @param sourceEnvironment - Source service environment
 * @param sourceAgent - Source service agent name
 * @param destinationResource - Destination resource identifier
 * @returns Document ID string
 */
export function buildDocId(
  prefix: string,
  sourceService: string,
  sourceEnvironment: string,
  sourceAgent: string,
  destinationResource: string
): string {
  const hash = createHash('sha256')
    .update(`${sourceService}::${sourceEnvironment}::${sourceAgent}::${destinationResource}`)
    .digest('hex')
    .substring(0, 16); // Use first 16 chars for readability while maintaining uniqueness

  return `${prefix}-${hash}`;
}

export function normalizeEmptyToNull<T>(value: T): T | null {
  return typeof value === 'string' && value === '' ? null : value;
}
