/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ApiParameter {
  group: string;
  type: any;
  size: undefined;
  allowedValues: undefined;
  optional: boolean;
  field: string;
  defaultValue: undefined;
  description?: string;
}

interface Local {
  group: string;
  type: string;
  url: string;
  title: string;
  name: string;
  description: string;
  parameter: {
    fields?: {
      [key: string]: ApiParameter[] | undefined;
    };
  };
  success: { fields: ObjectConstructor[] };
  version: string;
  filename: string;
  schemas?: Array<{
    name: string;
    group: string;
  }>;
}

export interface Block {
  global: any;
  local: Local;
}
