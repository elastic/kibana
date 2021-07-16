/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Store } from 'redux';

import { Storage } from '../../../../src/plugins/kibana_utils/public';
import type { DataPublicPluginStart } from '../../../../src/plugins/data/public';
import type {
  CoreSetup,
  Plugin,
  PluginInitializerContext,
  CoreStart,
} from '../../../../src/core/public';
import type { TimelinesUIStart, TGridProps } from './types';
import type { LastUpdatedAtProps, LoadingPanelProps, FieldBrowserWrappedProps } from './components';
import {
  getLastUpdatedLazy,
  getLoadingPanelLazy,
  getTGridLazy,
  getFieldsBrowserLazy,
} from './methods';
import { tGridReducer } from './store/t_grid/reducer';
import { useDraggableKeyboardWrapper } from './components/drag_and_drop/draggable_keyboard_wrapper_hook';
import { useAddToTimeline, useAddToTimelineSensor } from './hooks/use_add_to_timeline';
import * as hoverActions from './components/hover_actions';
export class TimelinesPlugin implements Plugin<void, TimelinesUIStart> {
  constructor(private readonly initializerContext: PluginInitializerContext) {}
  private _store: Store | undefined;
  private _storage = new Storage(localStorage);

  public setup(core: CoreSetup) {}

  public start(core: CoreStart, { data }: { data: DataPublicPluginStart }): TimelinesUIStart {
    const config = this.initializerContext.config.get<{ enabled: boolean }>();
    if (!config.enabled) {
      return {} as TimelinesUIStart;
    }
    return {
      getHoverActions: () => {
        return hoverActions;
      },
      getTGrid: (props: TGridProps) => {
        return getTGridLazy(props, {
          store: this._store,
          storage: this._storage,
          setStore: this.setStore.bind(this),
          data,
        });
      },
      getTGridReducer: () => {
        return tGridReducer;
      },
      getLoadingPanel: (props: LoadingPanelProps) => {
        return getLoadingPanelLazy(props);
      },
      getLastUpdated: (props: LastUpdatedAtProps) => {
        return getLastUpdatedLazy(props);
      },
      getFieldBrowser: (props: FieldBrowserWrappedProps) => {
        return getFieldsBrowserLazy(props, {
          store: this._store!,
        });
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
      setTGridEmbeddedStore: (store: Store) => {
        this.setStore(store);
      },
    };
  }

  private setStore(store: Store) {
    this._store = store;
  }

  public stop() {}
}
