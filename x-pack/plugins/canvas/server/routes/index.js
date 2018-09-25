/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { workpad } from './workpad';
import { socketApi } from '../../../../../src/core_plugins/interpreter/server/routes/socket';
import { translate } from '../../../../../src/core_plugins/interpreter/server/routes/translate';
import { esFields } from '../../../../../src/core_plugins/interpreter/server/routes/es_fields';
import { esIndices } from '../../../../../src/core_plugins/interpreter/server/routes/es_indices';
import { getAuth } from '../../../../../src/core_plugins/interpreter/server/routes/get_auth';
import { plugins } from './plugins';

export function routes(server) {
  workpad(server);
  socketApi(server);
  translate(server);
  esFields(server);
  esIndices(server);
  getAuth(server);
  plugins(server);
}
