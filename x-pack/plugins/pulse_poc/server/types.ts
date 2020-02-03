/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IScopedClusterClient, IClusterClient } from 'kibana/server';

export interface CheckContext {
  deploymentId: string;
  indexName: string;
}

export type PulsePOCCheckFunction<T = unknown> = (
  es: IScopedClusterClient,
  context: CheckContext
) => Promise<T[] | undefined>;

export type PulsePOCSetupFunction = (es: IClusterClient, indexName: string) => Promise<void>;
