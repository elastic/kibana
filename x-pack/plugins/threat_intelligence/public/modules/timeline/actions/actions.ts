/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import actionCreatorFactory from 'typescript-fsa';
import { DataProvider } from '@kbn/timelines-plugin/common';

// Sourcerer actions

const sourcererActionCreator = actionCreatorFactory('x-pack/security_solution/local/sourcerer');

export const setSelectedDataView = sourcererActionCreator<unknown>('SET_SELECTED_DATA_VIEW');

// Timeline actions

const timelineActionCreator = actionCreatorFactory('x-pack/security_solution/local/timeline');

export interface Timeline {
  columns: unknown[];
  dataProviders: DataProvider[];
  dataViewId: string;
  id: string;
  indexNames: string[];
  show: boolean;
  timelineType: string;
}

export const createTimeline = timelineActionCreator<Timeline>('CREATE_TIMELINE');
