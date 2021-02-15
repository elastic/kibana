/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from 'reselect';

import { TimelineStatus } from '../../../../../common/types/timeline';
import { timelineSelectors } from '../../../store/timeline';

export const getTimelineStatusByIdSelector = () =>
  createSelector(timelineSelectors.selectTimeline, (timeline) => ({
    status: timeline?.status ?? TimelineStatus.draft,
    updated: timeline?.updated ?? undefined,
  }));
