/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CasesClientArgs } from '..';
import { createCaseError } from '../../common/error';

/**
 * Tags API contract.
 */
export interface TagsSubClient {
  get(): Promise<string[]>;
}

/**
 * Creates the interface for retrieving the tags within cases.
 */
export function createTagsSubClient(clientArgs: CasesClientArgs): TagsSubClient {
  return Object.freeze({
    get: () => get(clientArgs),
  });
}

async function get({
  savedObjectsClient: soClient,
  caseService,
  logger,
}: CasesClientArgs): Promise<string[]> {
  try {
    return await caseService.getTags({
      soClient,
    });
  } catch (error) {
    throw createCaseError({ message: `Failed to get tags: ${error}`, error, logger });
  }
}
