/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const TYPE_NAMES = {
  // ES is removing types for 6.0.0, so we'll need to use `doc` until
  // they support PUT {index}/_doc/{id}
  PIPELINES: 'doc',
};
