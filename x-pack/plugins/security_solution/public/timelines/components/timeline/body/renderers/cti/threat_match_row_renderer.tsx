/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash/fp';

import { Ecs } from '../../../../../../../common/ecs';
import { RowRendererId } from '../../../../../../../common/types/timeline';
import { asArrayIfExists } from '../../../../../../common/lib/helpers';
import { RowRenderer } from '../row_renderer';
import { ThreatMatchRow } from './threat_match_row';

const THREAT_INDICATOR_FIELD = 'threat.indicator';
const isThreatMatch = (ecs: Ecs): boolean => {
  const [threatIndicator] = asArrayIfExists(get(THREAT_INDICATOR_FIELD, ecs)) ?? [];
  return !!threatIndicator?.matched;
};

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
