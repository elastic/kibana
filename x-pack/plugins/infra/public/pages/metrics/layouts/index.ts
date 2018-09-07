/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { hostLayout } from './host';
import { InfraMetricLayout } from './types';
interface Layouts {
  [key: string]: InfraMetricLayout[];
}
export const layouts: Layouts = {
  host: hostLayout,
};
