/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchHit } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DetectionsServiceStartDeps {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DetectionsServiceSetup {}

export interface DetectionsServiceStart {
  getClient(): IDetectionsClient;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IDetectionsClient {}

export interface LogSource {
  message?: string;
  [key: string]: unknown;
}

export type LogDocument = SearchHit<LogSource>;
