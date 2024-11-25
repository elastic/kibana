/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleMigrationsDataClient } from '../../data/rule_migrations_data_client';
import type { Integration } from '../../types';

export class IntegrationRetriever {
  constructor(private readonly dataClient: RuleMigrationsDataClient) {}

  public async getIntegrations(semanticString: string): Promise<Integration[]> {
    return this.integrationRetriever(semanticString);
  }

  private integrationRetriever = async (semanticString: string): Promise<Integration[]> => {
    const integrations = await this.dataClient.integrations.retrieveIntegrations(semanticString);

    return integrations;
  };
}
