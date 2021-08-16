/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ACTION_ADD_TO_CASE } from '../alerts_table/translations';

export const addToCaseActionItem = (timelineId: string | null | undefined) =>
  ['detections-page', 'detections-rules-details-page', 'timeline-1'].includes(timelineId ?? '')
    ? [
        {
          name: ACTION_ADD_TO_CASE,
          panel: 2,
        },
      ]
    : [];
