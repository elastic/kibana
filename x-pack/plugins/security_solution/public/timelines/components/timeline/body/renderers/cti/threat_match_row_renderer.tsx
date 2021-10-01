/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RowRendererId, RowRenderer } from '../../../../../../../common/types/timeline';
import { hasThreatMatchValue } from './helpers';
import { ThreatMatchRows } from './threat_match_rows';

export const threatMatchRowRenderer: RowRenderer = {
  id: RowRendererId.threat_match,
  isInstance: hasThreatMatchValue,
  renderRow: ThreatMatchRows,
};
