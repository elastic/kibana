/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useObservable from 'react-use/lib/useObservable';
import { BehaviorSubject } from 'rxjs';
import {
  PublicDrilldownManagerProps,
  DrilldownManagerDependencies,
  DrilldownManagerScreen,
} from '../types';
import { ActionFactory, BaseActionFactoryContext } from '../../../dynamic_actions';
import { DrilldownState } from './drilldown_state';

const helloMessageStorageKey = `drilldowns:hidWelcomeMessage`;

export interface DrilldownManagerStateDeps
  extends DrilldownManagerDependencies,
    PublicDrilldownManagerProps {}

/**
 * An instance of this class holds all the state necessary for Drilldown
 * Manager. It also holds all the necessary controllers to change the state.
 *
 * `<DrilldownManager>` and other container components access this state using
 * the `useDrilldownManager()` React hook:
 *
 * ```ts
 * const state = useDrilldownManager();
 * ```
 */
export class DrilldownManagerState {
  /**
   * Keeps track of the current view to display to the user.
   */
  public readonly screen$: BehaviorSubject<DrilldownManagerScreen>;

  /**
   * Whether a drilldowns welcome message should be displayed to the user at
   * the very top of the drilldowns manager flyout.
   */
  public readonly showWelcomeMessage$ = new BehaviorSubject<boolean>(
    this.deps.storage.get(helloMessageStorageKey) ?? false
  );

  /**
   * Currently selected action factory (drilldown type).
   */
  public readonly actionFactory$ = new BehaviorSubject<undefined | ActionFactory>(undefined);

  /**
   * State for each drilldown type used for new drilldown creation, so when user
   * switched between drilldown types the configuration of the previous
   * drilldown is preserved.
   */
  public readonly drilldownStateByFactoryId = new Map<string, DrilldownState>();

  /**
   * Whether user can unlock more drilldown types if they subscribe to a higher
   * license tier.
   */
  public readonly canUnlockMoreDrilldowns: boolean;

  constructor(public readonly deps: DrilldownManagerStateDeps) {
    this.screen$ = new BehaviorSubject<DrilldownManagerScreen>(deps.screen || 'list');
    this.canUnlockMoreDrilldowns = deps.actionFactories.some(
      (factory) => !factory.isCompatibleLicense
    );
  }

  /**
   * Change the screen of Drilldown Manager.
   */
  public setScreen(newScreen: DrilldownManagerScreen): void {
    this.screen$.next(newScreen);
  }

  /**
   * Callback called to hide drilldowns welcome message, and remember in local
   * storage that user opted to hide this message.
   */
  public readonly hideWelcomeMessage = (): void => {
    this.showWelcomeMessage$.next(false);
    this.deps.storage.set(helloMessageStorageKey, true);
  };

  /**
   * Select a different action factory.
   */
  public setActionFactory(actionFactory: undefined | ActionFactory): void {
    if (!actionFactory) {
      this.actionFactory$.next(undefined);
      return;
    }

    if (!this.drilldownStateByFactoryId.has(actionFactory.id)) {
      const oldActionFactory = this.actionFactory$.getValue();
      const oldDrilldownState = !!oldActionFactory
        ? this.drilldownStateByFactoryId.get(oldActionFactory.id)
        : undefined;
      const context = this.getActionFactoryContext();
      const drilldownState = new DrilldownState({
        factory: actionFactory,
        placeTriggers: this.deps.triggers,
        placeContext: this.deps.placeContext || {},
        name: !!oldDrilldownState ? oldDrilldownState.name$.getValue() : '',
        triggers: [],
        config: actionFactory.createConfig(context),
      });
      this.drilldownStateByFactoryId.set(actionFactory.id, drilldownState);
    }

    this.actionFactory$.next(actionFactory);
  }

  /**
   * Close the drilldown flyout.
   */
  public readonly close = (): void => {
    this.deps.onClose();
  };

  /**
   * Get action factory context, which also contains a custom place context
   * provided by the user who triggered rendering of the <DrilldownManager>.
   */
  public getActionFactoryContext(): BaseActionFactoryContext {
    const placeContext = this.deps.placeContext ?? [];
    const context: BaseActionFactoryContext = {
      ...placeContext,
      triggers: [],
    };

    return context;
  }

  /**
   * Get state object of the drilldown which is currently being created.
   */
  public getDrilldownState(): undefined | DrilldownState {
    const actionFactory = this.actionFactory$.getValue();
    if (!actionFactory) return undefined;
    const drilldownState = this.drilldownStateByFactoryId.get(actionFactory.id);
    return drilldownState;
  }

  // Below are convenience React hooks for consuming observables in connected
  // React components.

  /* eslint-disable react-hooks/rules-of-hooks */
  public readonly useScreen = () => useObservable(this.screen$, this.screen$.getValue());
  public readonly useWelcomeMessage = () =>
    useObservable(this.showWelcomeMessage$, this.showWelcomeMessage$.getValue());
  public readonly useActionFactory = () =>
    useObservable(this.actionFactory$, this.actionFactory$.getValue());
  /* eslint-enable react-hooks/rules-of-hooks */
}
