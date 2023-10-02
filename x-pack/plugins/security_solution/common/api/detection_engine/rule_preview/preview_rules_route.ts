/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { SharedCreateProps, TypeSpecificCreateProps } from '../model';

export type PreviewRulesSchema = t.TypeOf<typeof previewRulesSchema>;
export const previewRulesSchema = t.intersection([
  SharedCreateProps,
  TypeSpecificCreateProps,
  t.type({ invocationCount: t.number, timeframeEnd: t.string }),
]);

export interface RulePreviewLogs {
  errors: string[];
  warnings: string[];
  startedAt?: string;
  duration: number;
}

export interface PreviewResponse {
  previewId: string | undefined;
  logs: RulePreviewLogs[] | undefined;
  isAborted: boolean | undefined;
}
