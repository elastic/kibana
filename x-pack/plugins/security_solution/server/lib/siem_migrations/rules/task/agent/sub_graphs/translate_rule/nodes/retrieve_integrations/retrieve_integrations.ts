/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleMigrationsRetriever } from '../../../../../retrievers';
import type { GraphNode } from '../../types';

interface GetRetrieveIntegrationsNodeParams {
  ruleMigrationsRetriever: RuleMigrationsRetriever;
}

export const getRetrieveIntegrationsNode = ({
  ruleMigrationsRetriever,
}: GetRetrieveIntegrationsNodeParams): GraphNode => {
  return async (state) => {
    const query = state.semantic_query;

    const integrations = await ruleMigrationsRetriever.integrations.getIntegrations(query);
    return {
      integrations,
    };
  };
};
