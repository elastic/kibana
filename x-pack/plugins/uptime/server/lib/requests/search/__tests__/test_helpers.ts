/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { QueryContext } from '../query_context';
import { getUptimeESMockClient } from '../../__tests__/helper';

export const simpleQueryContext = (): QueryContext => {
  return new QueryContext(getUptimeESMockClient().uptimeEsClient, '', '', undefined, 0, '');
};
