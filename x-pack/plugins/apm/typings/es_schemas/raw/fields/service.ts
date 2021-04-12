/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface Service {
  name: string;
  environment?: string;
  framework?: {
    name: string;
    version?: string;
  };
  node?: {
    name?: string;
  };
  runtime?: {
    name: string;
    version: string;
  };
  language?: {
    name: string;
    version?: string;
  };
  version?: string;
}
