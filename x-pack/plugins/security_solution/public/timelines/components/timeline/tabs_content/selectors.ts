/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from 'reselect';
import { TimelineTabs } from '../../../../../common/types/timeline';
import { selectNotesById } from '../../../../common/store/app/selectors';
import { selectTimeline } from '../../../store/selectors';

export const getActiveTabSelector = () =>
  createSelector(selectTimeline, (timeline) => timeline?.activeTab ?? TimelineTabs.query);

export const getShowTimelineSelector = () =>
  createSelector(selectTimeline, (timeline) => timeline?.show ?? false);

export const getPinnedEventSelector = () =>
  createSelector(selectTimeline, (timeline) => Object.keys(timeline?.pinnedEventIds ?? {}).length);

export const getNoteIdsSelector = () =>
  createSelector(selectTimeline, (timeline) => timeline?.noteIds ?? []);

export const getEventIdToNoteIdsSelector = () =>
  createSelector(selectTimeline, (timeline) => timeline?.eventIdToNoteIds ?? {});

export const getNotesSelector = () =>
  createSelector(selectNotesById, (notesById) => Object.values(notesById));

export const getScrollToTopSelector = () =>
  createSelector(selectTimeline, (timeline) => timeline?.scrollToTop);
