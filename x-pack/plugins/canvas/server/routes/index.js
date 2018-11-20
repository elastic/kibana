/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { workpad } from './workpad';
import { esFields } from './es_fields';
<<<<<<< HEAD
import { esIndices } from './es_indices';
import { plugins } from './plugins';
=======
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1

export function routes(server) {
  workpad(server);
  esFields(server);
<<<<<<< HEAD
  esIndices(server);
  plugins(server);
=======
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
}
