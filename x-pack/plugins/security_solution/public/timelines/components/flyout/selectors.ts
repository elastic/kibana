/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';

import { TimelineStatus } from '../../../../common/types/timeline';
import { timelineSelectors } from '../../store/timeline';
import { TimelineTabs } from '../../store/timeline/model';

export const getTimelineShowStatusByIdSelector = () =>
  createSelector(timelineSelectors.selectTimeline, (timeline) => ({
    activeTab: timeline?.activeTab ?? TimelineTabs.query,
    status: timeline?.status ?? TimelineStatus.draft,
    show: timeline?.show ?? false,
    updated: timeline?.updated ?? undefined,
  }));
