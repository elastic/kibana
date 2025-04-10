/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IntegrationType, Status } from '@kbn/wci-common';

export const integrationTypeToLabel = (type: IntegrationType) => {
  switch (type) {
    case IntegrationType.index_source:
      return 'Index Source';
    case IntegrationType.external_server:
      return 'External Server';
    case IntegrationType.salesforce:
      return 'Salesforce';
    default:
      return type;
  }
};

export const statusToLabel = (status: Status) => {
  switch (status) {
    case Status.Connected:
      return 'Connected';
    case Status.Error:
      return 'Error';
    default:
      return status;
  }
};
