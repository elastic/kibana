/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { workpad } from './workpad';
import { socketApi } from './socket';
import { translate } from './translate';
import { esFields } from './es_fields';
import { esIndices } from './es_indices';
import { plugins } from './plugins';

export function routes(server) {
  workpad(server);
  socketApi(server);
  translate(server);
  esFields(server);
  esIndices(server);
  plugins(server);
}
