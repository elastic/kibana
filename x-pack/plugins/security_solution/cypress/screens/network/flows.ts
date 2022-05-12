/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const IPS_TABLE_LOADED = '[data-test-subj="table-topNFlowSource-loading-false"]';

export const EXPAND_OVERFLOW_ITEMS = '[data-test-subj="overflow-button"]';

export const FILTER_IN = '[data-test-subj="hover-actions-filter-for"]';

export const FILTER_OUT = '[data-test-subj="hover-actions-filter-out"]';

export const ADD_TO_TIMELINE = '[data-test-subj="add-to-timeline"]';

export const SHOW_TOP_FIELD = '[data-test-subj="show-top-field"]';

export const COPY = '[data-test-subj="clipboard"]';

export const TOP_N_CONTAINER = '[data-test-subj="topN-container"]';

export const CLOSE_TOP_N = '[data-test-subj="close"]';

export const DESTINATION_DOMAIN = (testDomain: string) =>
  `[data-test-subj="destination.domain-${testDomain}"]`;
