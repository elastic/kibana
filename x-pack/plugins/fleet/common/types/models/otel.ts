/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface OtelPolicy {
  id: string;
  name: string;
  description?: string;
  namespace?: string;
  policy_ids: string[];
  output_id?: string | null;
  integration?: {
    name: string;
    version?: string;
  };
  vars?: Record<string, string | string[]>;
  pipelines?: string[];
  revision: number;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
}

export interface OtelInputReceivers {
  receivers?: {
    [extendedName: string]: {
      name?: string;
      pipelines?: string[];
      parameters?: Record<string, string | string[]>;
    };
  };
}

export interface OtelInputExtensions {
  extensions?: {
    config_integrations?: { integrations?: string };
    file_integrations?: { path?: string };
  };
}
