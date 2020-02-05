/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IClusterClient, ScopedClusterClient } from 'src/core/server/';
import { KibanaRequest } from 'kibana/server';

export type CallESAsCurrentUser = ScopedClusterClient['callAsCurrentUser'];

export function getClusterAccessor(esClient: IClusterClient, req: KibanaRequest) {
  return esClient.asScoped(req).callAsCurrentUser;
}
