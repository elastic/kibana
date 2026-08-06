/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GENAI_EBT_CLICK_ACTIONS } from '@kbn/apm-ui-shared';
import type { EbtClickAttrs } from '@kbn/ebt-click';

export const GENAI_TAB_EBT_ELEMENTS = {
  /** `data-ebt-element` for copy-button clicks inside the GenAI tab body. */
  TAB_BODY: 'apmGenAiTab',
} as const;

/**
 * Single source for the `viewGenAi` click attributes of an APM-hosted GenAI
 * tab — used both for the tab definitions returned by `getGenAiTabContent`
 * and for surfaces that render their own tab elements (e.g. the trace sample
 * `TransactionTabs`).
 */
export function getGenAiTabEbt(element: string): EbtClickAttrs {
  return {
    action: GENAI_EBT_CLICK_ACTIONS.VIEW_GENAI,
    element,
  };
}
