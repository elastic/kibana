/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaFramework } from '../../lib/adapters/framework/kibana_framework_adapter';
import { InfraFieldsDomain } from '../../lib/domains/fields_domain';
import { initGetIndexFieldsRoute } from './get_index_fields';

export const initIndexFieldsRoutes = (dependencies: {
  framework: KibanaFramework;
  fields: InfraFieldsDomain;
}) => {
  initGetIndexFieldsRoute(dependencies);
};
