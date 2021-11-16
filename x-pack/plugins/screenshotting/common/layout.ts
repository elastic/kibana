/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Ensure, SerializableRecord } from '@kbn/utility-types';

/**
 * @internal
 */
export type Size = Ensure<
  {
    width: number;
    height: number;
  },
  SerializableRecord
>;

/**
 * @internal
 */
export interface LayoutSelectorDictionary {
  screenshot: string;
  renderComplete: string;
  renderError: string;
  renderErrorAttribute: string;
  itemsCountAttribute: string;
  timefilterDurationAttribute: string;
}

export type LayoutParams = Ensure<
  {
    id?: string;
    dimensions?: Size;
    selectors?: Partial<LayoutSelectorDictionary>;
    zoom?: number;
  },
  SerializableRecord
>;
