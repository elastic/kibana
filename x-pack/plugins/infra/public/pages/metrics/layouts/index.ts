/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { containerLayoutCreator } from './container';
import { hostLayoutCreator } from './host';
import { podLayoutCreator } from './pod';
import { InfraMetricLayoutCreator } from './types';

interface Layouts {
  [key: string]: InfraMetricLayoutCreator;
}

export const layoutCreators: Layouts = {
  host: hostLayoutCreator,
  pod: podLayoutCreator,
  container: containerLayoutCreator,
};
