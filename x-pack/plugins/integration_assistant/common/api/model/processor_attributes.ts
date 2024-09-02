/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

/**
 * Processor item for the Elasticsearch processor.
 */
export type ESProcessorItem = Record<string, ESProcessorOptions>;
export const ESProcessorItem: z.ZodType<ESProcessorItem> = z
  .object({})
  .catchall(z.lazy(() => ESProcessorOptions));

/**
 * Processor options for the Elasticsearch processor.
 */
export interface ESProcessorOptions {
  on_failure?: ESProcessorItem[];
  ignore_failure?: boolean;
  ignore_missing?: boolean;
  if?: string;
  tag?: string;
  [key: string]: unknown;
}
export const ESProcessorOptions = z
  .object({
    /**
     * An array of items to execute if the processor fails.
     */
    on_failure: z.array(ESProcessorItem).optional(),
    /**
     * If true, the processor continues to the next processor if the current processor fails.
     */
    ignore_failure: z.boolean().optional(),
    /**
     * If true, the processor continues to the next processor if the field is missing.
     */
    ignore_missing: z.boolean().optional(),
    /**
     * Conditionally execute the processor.
     */
    if: z.string().optional(),
    /**
     * A tag to assign to the document after processing.
     */
    tag: z.string().optional(),
  })
  .catchall(z.unknown());
