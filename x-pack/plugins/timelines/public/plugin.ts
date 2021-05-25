/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { CoreSetup, Plugin, PluginInitializerContext } from '../../../../src/core/public';
import { TimelinesPluginSetup, TGridProps } from './types';
import { getLastUpdatedLazy, getLoadingPanelLazy, getTGridLazy } from './methods';
import { tGridActions, getReduxDeps, tGridSelectors } from './store/t_grid';
import { initialTGridState, tGridReducer } from './store/t_grid/reducer';
import { useAddToTimeline, useAddToTimelineSensor } from './hooks/use_add_to_timeline';
import { LastUpdatedAtProps, LoadingPanelProps, useDraggableKeyboardWrapper } from './components';

export class TimelinesPlugin implements Plugin<TimelinesPluginSetup> {
  constructor(private readonly initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup): TimelinesPluginSetup {
    const config = this.initializerContext.config.get<{ enabled: boolean }>();
    if (!config.enabled) {
      return {} as TimelinesPluginSetup;
    }

    return {
      getTGrid: (props: TGridProps) => {
        return getTGridLazy(props);
      },
      getTimelineStore: () => {
        return {
          actions: tGridActions,
          initialState: initialTGridState,
          reducer: tGridReducer,
          selectors: tGridSelectors,
        };
      },
      getCreatedTgridStore: (type: TGridProps['type']) => {
        return getReduxDeps(type);
      },
      getLoadingPanel: (props: LoadingPanelProps) => {
        return getLoadingPanelLazy(props);
      },
      getLastUpdated: (props: LastUpdatedAtProps) => {
        return getLastUpdatedLazy(props);
      },
      getUseAddToTimeline: () => {
        return useAddToTimeline;
      },
      getUseAddToTimelineSensor: () => {
        return useAddToTimelineSensor;
      },
      getUseDraggableKeyboardWrapper: () => {
        return useDraggableKeyboardWrapper;
      },
    };
  }

  public start() {
    const config = this.initializerContext.config.get<{ enabled: boolean }>();
    if (!config.enabled) {
      return {};
    }
    return {
      getTGrid: (props: TGridProps) => {
        return getTGridLazy(props);
      },
      getTimelineStore: () => {
        return {
          actions: tGridActions,
          initialState: initialTGridState,
          reducer: tGridReducer,
        };
      },
      getCreatedTgridStore: (type: TGridProps['type']) => {
        return getReduxDeps(type);
      },
      getLoadingPanel: (props: LoadingPanelProps) => {
        return getLoadingPanelLazy(props);
      },
      getLastUpdated: (props: LastUpdatedAtProps) => {
        return getLastUpdatedLazy(props);
      },
      getUseAddToTimeline: () => {
        return useAddToTimeline;
      },
      getUseAddToTimelineSensor: () => {
        return useAddToTimelineSensor;
      },
      getUseDraggableKeyboardWrapper: () => {
        return useDraggableKeyboardWrapper;
      },
    };
  }

  public stop() {}
}
