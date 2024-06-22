/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as z from 'zod';
import { SharedCreateProps, TypeSpecificCreateProps } from '../model/rule_schema';
import type { RulePreviewLogs } from './rule_preview.gen';

export type PreviewRulesSchema = z.infer<typeof PreviewRulesSchema>;
export const PreviewRulesSchema = SharedCreateProps.and(TypeSpecificCreateProps).and(
  z.object({ invocationCount: z.number(), timeframeEnd: z.string() })
);

export interface PreviewResponse {
  previewId: string | undefined;
  logs: RulePreviewLogs[] | undefined;
  isAborted: boolean | undefined;
}
