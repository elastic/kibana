/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TableId } from '../../../common/types';
import { DEFAULT_ALERTS_INDEX } from '../../../common/constants';

export const detectionsTimelineIds = [TableId.alertsOnAlertsPage, TableId.alertsOnRuleDetailsPage];

// TODO: Once we are past experimental phase `useRuleRegistry` should be removed
export const skipQueryForDetectionsPage = (
  id: string,
  defaultIndex: string[],
  useRuleRegistry = false
) =>
  id != null &&
  detectionsTimelineIds.some((timelineId) => timelineId === id) &&
  !defaultIndex.some((di) =>
    di.toLowerCase().startsWith(useRuleRegistry ? DEFAULT_ALERTS_INDEX : '.siem-signals')
  );
