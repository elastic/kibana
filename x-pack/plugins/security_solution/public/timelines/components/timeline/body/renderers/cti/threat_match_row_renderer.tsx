/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RowRenderer } from '../../../../../../../common/types/timeline';
import { RowRendererId } from '../../../../../../../common/api/timeline';
import { hasThreatMatchValue } from './helpers';
import { renderThreatMatchRows } from './threat_match_rows';

export const threatMatchRowRenderer: RowRenderer = {
  id: RowRendererId.threat_match,
  isInstance: hasThreatMatchValue,
  renderRow: renderThreatMatchRows,
};
