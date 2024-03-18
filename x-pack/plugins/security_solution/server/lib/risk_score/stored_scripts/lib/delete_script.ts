/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { DeleteStoredScriptRequestBody } from '../../../../../common/api/entity_analytics/risk_score';

export const deleteStoredScript = async ({
  client,
  options,
}: {
  client: IScopedClusterClient;
  options: DeleteStoredScriptRequestBody;
}) => {
  await client.asCurrentUser.deleteScript(options);
};
