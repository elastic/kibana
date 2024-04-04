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
  title?: IntegrationType['title'];
  description?: IntegrationType['description'];
  icons?: IntegrationType['icons'];
  status: IntegrationType['status'];
  version: IntegrationType['version'];
  datasets: Dataset[];

  private constructor(integration: Integration) {
    this.id = integration.id;
    this.name = integration.name;
    this.title = integration.title;
    this.description = integration.description;
    this.icons = integration.icons;
    this.status = integration.status;
    this.version = integration.version;
    this.datasets = integration.datasets;
  }

  public static create(integration: IntegrationType) {
    const integrationProps = {
      ...integration,
      id: `integration-${integration.name}-${integration.version}` as IntegrationId,
      title: integration.title ?? integration.name,
    };
    return new Integration({
      ...integrationProps,
      datasets: integration.dataStreams.map((dataset) => Dataset.create(dataset, integrationProps)),
    });
  }
}
