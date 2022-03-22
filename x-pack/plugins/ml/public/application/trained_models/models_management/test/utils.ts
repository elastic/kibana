/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

export function isTestable(model: estypes.MlTrainedModelConfig) {
  if (
    model.model_type === 'pytorch' ||
    model.model_type === 'lang_ident' ||
    model.model_id === 'dga_1611725_2.0'
  ) {
    return true;
  }
  return false;
}
