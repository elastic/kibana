/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { services as deploymentAgnosticServices } from '../../api_integration_deployment_agnostic/services';

export const services = {
  ...deploymentAgnosticServices,
  // Add any additional serverless-specific services here
};
