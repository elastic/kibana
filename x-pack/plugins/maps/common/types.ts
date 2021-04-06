/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface CreateDocSourceResp {
  indexPatternId?: string;
  success: boolean;
  error?: Error;
}

export interface IndexSourceMappings {
  _meta?: {
    created_by: string;
  };
  properties: {
    [key: string]: any;
  };
}

export interface BodySettings {
  [key: string]: any;
}

export interface WriteSettings {
  index: string;
  body: object;
  [key: string]: any;
}
