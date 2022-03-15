/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Store, Unsubscribe } from 'redux';
import { throttle } from 'lodash';

import { Storage } from '../../../../src/plugins/kibana_utils/public';
import type { CoreSetup, Plugin, CoreStart } from '../../../../src/core/public';
import type { LastUpdatedAtProps, LoadingPanelProps, FieldBrowserProps } from './components';
import {
  getLastUpdatedLazy,
  getLoadingPanelLazy,
  getTGridLazy,
  getFieldsBrowserLazy,
} from './methods';
import type { TimelinesUIStart, TGridProps, TimelinesStartPlugins } from './types';
import { tGridReducer } from './store/t_grid/reducer';
import { useDraggableKeyboardWrapper } from './components/drag_and_drop/draggable_keyboard_wrapper_hook';
import { useAddToTimeline, useAddToTimelineSensor } from './hooks/use_add_to_timeline';
import { getHoverActions } from './components/hover_actions';

export class TimelinesPlugin implements Plugin<void, TimelinesUIStart> {
  private _store: Store | undefined;
  private _storage = new Storage(localStorage);
  private _storeUnsubscribe: Unsubscribe | undefined;

  public setup(core: CoreSetup) {}

  public start(core: CoreStart, { data }: TimelinesStartPlugins): TimelinesUIStart {
    return {
      getHoverActions: () => {
        return getHoverActions(this._store);
      },
      getTGrid: (props: TGridProps) => {
        if (props.type === 'standalone' && this._store) {
          const { getState } = this._store;
          const state = getState();
          if (state && state.app) {
            this._store = undefined;
          } else {
            if (props.onStateChange) {
              this._storeUnsubscribe = this._store.subscribe(
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                throttle(() => props.onStateChange!(getState()), 500)
              );
            }
          }
        }
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
      getFieldBrowser: (props: FieldBrowserProps) => {
        return getFieldsBrowserLazy(props, {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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

  public stop() {
    if (this._storeUnsubscribe) {
      this._storeUnsubscribe();
    }
  }
}
