/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { workpad } from './workpad';
import { kibana } from './kibana';
import { socketApi } from './socket';
import { translate } from './translate';
import { esFields } from './es_fields';
import { esIndices } from './es_indices';
import { getAuth } from './get_auth';
import { plugins } from './plugins';

export function routes(server) {
  workpad(server);
  kibana(server);
  socketApi(server);
  translate(server);
  esFields(server);
  esIndices(server);
  getAuth(server);
  plugins(server);
}
