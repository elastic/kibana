/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CasesClientArgs } from '..';
import { User, UsersRt } from '../../../common/api';
import { createCaseError } from '../../common/error';

/**
 * Reporters API contract.
 */
export interface ReportersSubClient {
  get(): Promise<User[]>;
}

/**
 * Creates the interface for retrieving the reporters of cases.
 */
export function createReportersSubClient(clientArgs: CasesClientArgs): ReportersSubClient {
  return Object.freeze({
    get: () => get(clientArgs),
  });
}

async function get({
  savedObjectsClient: soClient,
  caseService,
  logger,
}: CasesClientArgs): Promise<User[]> {
  try {
    const reporters = await caseService.getReporters({
      soClient,
    });
    return UsersRt.encode(reporters);
  } catch (error) {
    throw createCaseError({ message: `Failed to get reporters: ${error}`, error, logger });
  }
}
