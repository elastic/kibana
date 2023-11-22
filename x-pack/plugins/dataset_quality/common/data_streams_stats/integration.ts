/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IntegrationType } from './types';

export class Integration {
  name: IntegrationType['name'];
  managedBy?: IntegrationType['managed_by'];

  private constructor(integration: Integration) {
    this.name = integration.name;
    this.managedBy = integration.managedBy ?? '';
  }

  public static create(integration: IntegrationType) {
    // TODO: implement icon construction and title

    const integrationProps = {
      ...integration,
      name: integration.name,
      managedBy: integration.managed_by ?? '',
    };

    return new Integration(integrationProps);
  }
}
