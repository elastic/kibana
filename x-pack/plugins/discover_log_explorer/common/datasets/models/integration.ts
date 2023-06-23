/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Dataset } from './dataset';
import { IntegrationId, IntegrationType } from '../types';

export class Integration {
  id: IntegrationId;
  name: IntegrationType['name'];
  status: IntegrationType['status'];
  version: IntegrationType['version'];
  dataStreams: Dataset[];

  private constructor(integration: Integration) {
    this.id = integration.id;
    this.name = integration.name;
    this.status = integration.status;
    this.version = integration.version;
    this.dataStreams = integration.dataStreams;
  }

  public static create(integration: IntegrationType) {
    return {
      ...integration,
      id: `integration-${integration.name}-${integration.version}` as IntegrationId,
      dataStreams: integration.dataStreams.map((dataset) => Dataset.create(dataset, integration)),
    };
  }
}
