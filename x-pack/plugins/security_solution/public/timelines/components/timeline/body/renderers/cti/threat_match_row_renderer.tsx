/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';

import { Ecs } from '../../../../../../../common/ecs';
import { TimelineNonEcsData } from '../../../../../../../common/search_strategy';
import { RowRendererId } from '../../../../../../../common/types/timeline';
import { RowRenderer } from '../row_renderer';
import { ThreatMatchRow } from './threat_match_row';

const THREAT_MATCH_FIELD = 'threat.indicator.matched.type';
const isThreatMatch = (ecs: Ecs, fields: TimelineNonEcsData[] = []): boolean =>
  fields.some((field) => field.field === THREAT_MATCH_FIELD && !isEmpty(field.value));

export const requiredFields = [
  'threat.indicator.event.dataset',
  'threat.indicator.event.reference',
  'threat.indicator.provider',
  'threat.indicator.matched.atomic',
  'threat.indicator.matched.field',
  'threat.indicator.matched.type',
];

export const threatMatchRowRenderer: RowRenderer = {
  id: RowRendererId.threat_match,
  isInstance: isThreatMatch,
  renderRow: ThreatMatchRow,
};
