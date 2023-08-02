/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { ActionsClientContext } from '../../../../../actions_client';
import { Connector } from '../../../types';

export interface GetAllParams {
  includeSystemActions?: boolean;
  context: ActionsClientContext;
}

export interface InjectExtraFindDataParams {
  kibanaIndices: string[];
  scopedClusterClient: IScopedClusterClient;
  connectors: Connector[];
}
