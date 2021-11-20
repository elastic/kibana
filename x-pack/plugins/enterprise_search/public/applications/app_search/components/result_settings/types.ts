/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldValue } from '../result/types';

export interface ServerFieldResultSetting {
  raw?:
    | {
        size?: number;
      }
    | boolean;
  snippet?:
    | {
        size?: number;
        fallback?: boolean;
      }
    | boolean;
}

export type ServerFieldResultSettingObject = Record<string, ServerFieldResultSetting>;

export interface FieldResultSetting {
  raw: boolean;
  rawSize?: number;
  snippet: boolean;
  snippetSize?: number;
  snippetFallback: boolean;
}

export type FieldResultSettingObject = Record<string, FieldResultSetting | {}>;

export type SampleSearchResponse = Record<string, FieldValue>;
