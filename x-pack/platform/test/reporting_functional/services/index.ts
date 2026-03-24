/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { services as apiServices } from '../../reporting_api_integration/services';
import { ReportingFunctionalProvider } from './reporting_functional_provider';

export { ReportingFunctionalProvider } from './reporting_functional_provider';

export const services = {
  ...apiServices,
  reportingFunctional: ReportingFunctionalProvider,
};
