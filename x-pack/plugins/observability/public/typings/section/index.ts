/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ObservabilityFetchDataPlugins } from '../fetch_overview_data';

export interface ISection {
  id: ObservabilityFetchDataPlugins | 'alert';
  title: string;
  icon: string;
  description: string;
  href?: string;
  linkTitle?: string;
  target?: '_blank';
}
