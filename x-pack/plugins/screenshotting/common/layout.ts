/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Ensure, SerializableRecord, Values } from '@kbn/utility-types';

export type LayoutId = Values<Pick<typeof LayoutTypes, 'PRESERVE_LAYOUT' | 'CANVAS' | 'PRINT'>>;

/**
 * @internal
 */
export type Size = Ensure<
  {
    /**
     * Layout width.
     */
    width: number;

    /**
     * Layout height.
     */
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

/**
 * Screenshot layout parameters.
 */
export type LayoutParams<Id = LayoutId> = Ensure<
  {
    /**
     * Unique layout name.
     */
    id?: Id;

    /**
     * Layout sizing.
     */
    dimensions?: Size;

    /**
     * Element selectors determining the page state.
     */
    selectors?: Partial<LayoutSelectorDictionary>;

    /**
     * Page zoom.
     */
    zoom?: number;
  },
  SerializableRecord
>;

/**
 * Supported layout types.
 */
export enum LayoutTypes {
  PRESERVE_LAYOUT = 'preserve_layout',
  PRINT = 'print',
  CANVAS = 'canvas',
}
