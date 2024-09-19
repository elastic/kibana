/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Readable } from 'stream';
import { createPromiseFromStreams } from '@kbn/utils';
import type { SavedObject } from '@kbn/core/server';
import type {
  ImportExceptionsListSchema,
  ImportExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';

import { createRulesAndExceptionsStreamFromNdJson } from './create_rules_stream_from_ndjson';
import type { RuleFromImportStream } from './types';

export interface RuleImportStreamResult {
  rules: RuleFromImportStream[];
  exceptions: Array<ImportExceptionsListSchema | ImportExceptionListItemSchema>;
  actionConnectors: SavedObject[];
}

/**
 * Utility for generating a promise from a Readable stream corresponding to an
 * NDJSON file. Used during rule import.
 */
export const createPromiseFromRuleImportStream = ({
  objectLimit,
  stream,
}: {
  objectLimit: number;
  stream: Readable;
}): Promise<RuleImportStreamResult[]> => {
  const readAllStream = createRulesAndExceptionsStreamFromNdJson(objectLimit);

  return createPromiseFromStreams<RuleImportStreamResult[]>([stream, ...readAllStream]);
};
