/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from 'reselect';
import { TimelineTabs } from '../../../../../../../common/types/timeline';
import { selectTimeline } from '../../../../../store/selectors';

export const isEqlOnSelector = () =>
  createSelector(selectTimeline, (timeline) => timeline?.activeTab === TimelineTabs.eql);
