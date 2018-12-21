/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { globalizeSelectors } from '../../utils/typed_redux';
import { logEntriesSelectors as innerLogEntriesSelectors } from './log_entries';
import { logSummarySelectors as innerLogSummarySelectors } from './log_summary';
import { RemoteState } from './reducer';

export const logEntriesSelectors = globalizeSelectors(
  (state: RemoteState) => state.logEntries,
  innerLogEntriesSelectors
);

export const logSummarySelectors = globalizeSelectors(
  (state: RemoteState) => state.logSummary,
  innerLogSummarySelectors
);
