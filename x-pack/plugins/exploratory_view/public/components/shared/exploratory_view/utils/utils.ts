/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApmIndicesConfig } from '@kbn/observability-shared-plugin/public';
import { uniq } from 'lodash';

export function getApmDataViewTitle(apmIndicesConfig?: ApmIndicesConfig) {
  if (!apmIndicesConfig) {
    return;
  }
  return uniq([apmIndicesConfig.transaction, apmIndicesConfig.metric]).join(',');
}
