/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Subscription } from 'rxjs';
import { History, createHashHistory } from 'history';
import { RefreshInterval, TimeRange, syncQueryStateWithUrl } from '@kbn/data-plugin/public';
import {
  createStateContainer,
  createKbnUrlStateStorage,
  StateContainer,
  INullableBaseStateContainer,
  IKbnUrlStateStorage,
  ISyncStateRef,
  syncState,
  withNotifyOnErrors,
} from '@kbn/kibana-utils-plugin/public';
import { MonitoringStartPluginDependencies, MonitoringStartServices } from './types';
import { Legacy } from './legacy_shims';

interface RawObject {
  [key: string]: unknown;
}

export interface MonitoringAppState {
  [key: string]: unknown;
  cluster_uuid?: string;
  ccs?: boolean;
  inSetupMode?: boolean;
  refreshInterval?: RefreshInterval;
  time?: TimeRange;
  filters?: any[];
}

export interface MonitoringAppStateTransitions {
  set: (
    state: MonitoringAppState
  ) => <T extends keyof MonitoringAppState>(
    prop: T,
    value: MonitoringAppState[T]
  ) => MonitoringAppState;
}

const GLOBAL_STATE_KEY = '_g';
const objectEquals = (objA: any, objB: any) => JSON.stringify(objA) === JSON.stringify(objB);

export class GlobalState {
  private readonly stateSyncRef: ISyncStateRef;
  private readonly stateContainer: StateContainer<
    MonitoringAppState,
    MonitoringAppStateTransitions
  >;
  private readonly stateStorage: IKbnUrlStateStorage;
  private readonly stateContainerChangeSub: Subscription;
  private readonly syncQueryStateWithUrlManager: { stop: () => void };
  private readonly timefilterRef: MonitoringStartPluginDependencies['data']['query']['timefilter']['timefilter'];

  private lastAssignedState: MonitoringAppState = {};

  constructor(
    queryService: MonitoringStartPluginDependencies['data']['query'],
    toasts: MonitoringStartServices['notifications']['toasts'],
    externalState: RawObject
  ) {
    this.timefilterRef = queryService.timefilter.timefilter;

    const history: History = createHashHistory();
    this.stateStorage = createKbnUrlStateStorage({
      useHash: false,
      history,
      ...withNotifyOnErrors(toasts),
    });

    const initialStateFromUrl = this.stateStorage.get(GLOBAL_STATE_KEY) as MonitoringAppState;

    this.stateContainer = createStateContainer(initialStateFromUrl, {
      set: (state) => (prop, value) => ({ ...state, [prop]: value }),
    });

    this.stateSyncRef = syncState({
      storageKey: GLOBAL_STATE_KEY,
      stateContainer: this.stateContainer as INullableBaseStateContainer<MonitoringAppState>,
      stateStorage: this.stateStorage,
    });

    this.stateContainerChangeSub = this.stateContainer.state$.subscribe(() => {
      this.lastAssignedState = this.getState();

      // TODO: check if this is not needed after https://github.com/elastic/kibana/pull/109132 is merged
      if (Legacy.isInitializated()) {
        Legacy.shims.breadcrumbs.update();
      }

      this.syncExternalState(externalState);
    });

    this.syncQueryStateWithUrlManager = syncQueryStateWithUrl(queryService, this.stateStorage);
    this.stateSyncRef.start();
    this.lastAssignedState = this.getState();
  }

  private syncExternalState(externalState: { [key: string]: unknown }) {
    const currentState = this.stateContainer.get();
    for (const key in currentState) {
      if (
        ({ save: 1, time: 1, refreshInterval: 1, filters: 1 } as { [key: string]: number })[key]
      ) {
        continue;
      }
      if (currentState[key] !== externalState[key]) {
        externalState[key] = currentState[key];
      }
    }
  }

  public setState(state?: { [key: string]: unknown }) {
    const currentAppState = this.getState();
    const newAppState = { ...currentAppState, ...state };
    if (state && objectEquals(newAppState, currentAppState)) {
      return;
    }
    const newState = {
      ...newAppState,
      refreshInterval: this.timefilterRef.getRefreshInterval(),
      time: this.timefilterRef.getTime(),
    };
    this.lastAssignedState = newState;
    this.stateContainer.set(newState);
  }

  public getState(): MonitoringAppState {
    const currentState = { ...this.lastAssignedState, ...this.stateContainer.get() };
    delete currentState.filters;
    const { refreshInterval: _nullA, time: _nullB, ...currentAppState } = currentState;
    return currentAppState || {};
  }

  public destroy() {
    this.syncQueryStateWithUrlManager.stop();
    this.stateContainerChangeSub.unsubscribe();
    this.stateSyncRef.stop();
  }
}
