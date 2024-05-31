/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APMRouteHandlerResources } from '../../routes/apm_routes/register_apm_server_routes';

export async function getESCapabilities({ core }: APMRouteHandlerResources) {
  const es = (await core.start()).elasticsearch;

  return es.getCapabilities();
}
