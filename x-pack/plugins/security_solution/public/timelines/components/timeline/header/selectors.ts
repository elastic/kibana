/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from 'reselect';

import { timelineSelectors } from '../../../store/timeline';

export const getTimelineSaveModalByIdSelector = () =>
  createSelector(timelineSelectors.selectTimeline, (timeline) => timeline?.showSaveModal ?? false);
