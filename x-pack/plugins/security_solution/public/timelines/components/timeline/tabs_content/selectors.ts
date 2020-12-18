/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';
import { selectNotesById } from '../../../../common/store/app/selectors';
import { TimelineTabs } from '../../../store/timeline/model';
import { selectTimeline } from '../../../store/timeline/selectors';

export const getActiveTabSelector = () =>
  createSelector(selectTimeline, (timeline) => timeline?.activeTab ?? TimelineTabs.query);

export const getShowTimelineSelector = () =>
  createSelector(selectTimeline, (timeline) => timeline?.show ?? false);

export const getPinnedEventSelector = () =>
  createSelector(selectTimeline, (timeline) => Object.keys(timeline?.pinnedEventIds ?? {}).length);

export const getNotesSelector = () =>
  createSelector(selectNotesById, (notesById) => Object.keys(notesById ?? {}).length);
