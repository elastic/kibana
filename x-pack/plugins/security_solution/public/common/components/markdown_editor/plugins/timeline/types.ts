/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ID } from './constants';

export interface TimelineConfiguration {
  id: string | null;
  title: string;
  graphEventId?: string;
  [key: string]: string | null | undefined;
}

export interface TimelineProps extends TimelineConfiguration {
  type: typeof ID;
}
