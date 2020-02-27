/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectAttributes } from '../../../../../../src/core/public';

export interface NewDatasource extends SavedObjectAttributes {
  id?: string;
  enabled?: boolean;
  title?: string;
  config_id: string;
  package?: {
    name: string;
    version: string;
  };
  namespace?: string;
  constraints?: Array<Record<string, Record<string, any>>>;
  use_output: string;
  inputs: Array<{
    type: string;
    processors?: string[];
    streams: Array<{
      id?: string;
      enabled?: boolean;
      dataset: string;
      paths: string;
    }>;
  }>;
}

export interface Datasource extends NewDatasource {
  id: string;
}
