/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ID } from './constants';

export interface LensConfiguration {
  id: string | null;
  title: string;
  graphEventId?: string;
  [key: string]: string | null | undefined;
}

export interface LensProps extends LensConfiguration {
  type: typeof ID;
}
