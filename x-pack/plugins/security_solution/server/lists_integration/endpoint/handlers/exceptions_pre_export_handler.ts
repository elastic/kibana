/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import { ExtensionPoint } from '../../../../../lists/server';

export const getExceptionsPreExportHandler = (
  endpointAppContext: EndpointAppContextService
): (ExtensionPoint & { type: 'exceptionsListPreExport' })['callback'] => {
  return async function ({ data }) {
    // Individual validators here

    return data;
  };
};
