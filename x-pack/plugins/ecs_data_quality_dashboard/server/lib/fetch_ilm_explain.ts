/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IlmExplainLifecycleResponse } from '@elastic/elasticsearch/lib/api/types';
import type { IScopedClusterClient } from '@kbn/core/server';

export const fetchILMExplain = (
  client: IScopedClusterClient,
  indexPattern: string
): Promise<IlmExplainLifecycleResponse> =>
  client.asCurrentUser.ilm.explainLifecycle({
    index: indexPattern,
  });
