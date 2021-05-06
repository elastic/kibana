/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReactElement } from 'react';
import { Store } from 'redux';
import { tGridActions } from './store/t_grid';
import { tGridReducer } from './store/t_grid/reducer';
import { TimelineState } from './store/t_grid/types';
export * from './store/t_grid';
export interface TimelinesPluginSetup {
  getTimeline?: (props: TimelineProps) => ReactElement<TimelineProps>;
  getTimelineStore?: () => ReduxDeps;
  getCreatedTgridStore?: (
    type: EmbeddedProps['type']
  ) => ReduxDeps | ((type: StandaloneProps['type']) => Store);
}

export interface ReduxDeps {
  actions: typeof tGridActions;
  reducer: typeof tGridReducer;
  initialState: TimelineState;
}

interface StandaloneProps {
  type: 'standalone';
}

interface EmbeddedProps {
  type: 'embedded';
}

interface BaseTimelineProps {
  timelineId: string;
}

export type TimelineProps = BaseTimelineProps & (EmbeddedProps | StandaloneProps);
