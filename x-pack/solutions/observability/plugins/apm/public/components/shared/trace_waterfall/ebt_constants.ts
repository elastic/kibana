/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * EBT element name constants for the APM trace waterfall.
 *
 * These values populate `data-ebt-element` HTML attributes.
 * Actions are fixed by the components: rows emit 'viewSpan', error badges emit 'viewError'.
 * Use context.pageName to segment by surface (apm vs discover).
 */

/** Clickable row in the main APM transaction details waterfall. */
export const EBT_ELEMENT_WATERFALL_ROW = 'waterfallRow';

/** Error badge in the main APM transaction details waterfall. */
export const EBT_ELEMENT_WATERFALL_ERROR_BADGE = 'waterfallErrorBadge';

/** Clickable row in the full-trace flyout opened from within APM. */
export const EBT_ELEMENT_FLYOUT_WATERFALL_ROW = 'flyoutWaterfallRow';

/** Error badge in the full-trace flyout opened from within APM. */
export const EBT_ELEMENT_FLYOUT_WATERFALL_ERROR_BADGE = 'flyoutWaterfallErrorBadge';
