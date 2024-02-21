/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface SavedScriptSavedObject {
  id: string;
  description: string | undefined;
  command: string;
  timeout?: number;
  platform: string;
  created_at: string;
  created_by: string | undefined;
  updated_at: string;
  updated_by: string | undefined;
  prebuilt?: boolean;
  version: number;
}
