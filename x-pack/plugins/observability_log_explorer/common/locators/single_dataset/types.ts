/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DatasetLocatorParams } from '../types';

export interface SingleDatasetLocatorParams extends DatasetLocatorParams {
  /**
   * Integration name to be selected.
   */
  integration?: string;
  /**
   * Dataset name to be selected.
   */
  dataset: string;
}
