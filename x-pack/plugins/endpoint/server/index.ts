/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { EndpointPlugin } from './plugin';

export function plugin() {
  return new EndpointPlugin();
}

// The following config disabled the plugin by default once the following pull request is
// merged (and pulled into our branch): https://github.com/elastic/kibana/pull/50286
// To re-enable it for Development, add the following to your `/config/kibana.dev.yml` file:
//
// `x-pack.endpoint.enabled: true`
//
// See this for more: https://github.com/elastic/endpoint-app-team/issues/1
export const config = {
  schema: schema.object({ enabled: schema.boolean({ defaultValue: false }) }),
};
