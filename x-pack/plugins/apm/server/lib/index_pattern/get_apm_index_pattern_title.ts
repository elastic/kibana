/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { APMRequestHandlerContext } from '../../routes/typings';

export function getApmIndexPatternTitle(context: APMRequestHandlerContext) {
  return context.config['apm_oss.indexPattern'];
}
