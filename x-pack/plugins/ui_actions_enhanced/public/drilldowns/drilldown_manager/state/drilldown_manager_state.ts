/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useObservable from 'react-use/lib/useObservable';
import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { PublicDrilldownManagerProps, DrilldownManagerDependencies } from '../types';
import { ActionFactory, BaseActionFactoryContext, SerializedEvent } from '../../../dynamic_actions';
import { DrilldownState } from './drilldown_state';
import {
  toastDrilldownCreated,
  toastDrilldownsCRUDError,
  insufficientLicenseLevel,
  invalidDrilldownType,
  txtDefaultTitle,
} from './i18n';
import { DrilldownListItem } from '../components/list_manage_drilldowns';

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
   * Title displayed at the top of <DrilldownManager> flyout.
   */
  private readonly title$ = new BehaviorSubject<React.ReactNode>(txtDefaultTitle);

  /**
   * Footer displayed at the bottom of <DrilldownManager> flyout.
   */
  private readonly footer$ = new BehaviorSubject<React.ReactNode>(null);

  /**
   * Route inside Drilldown Manager flyout that is displayed to the user. Some
   * available routes are:
   *
   * - `['create']`
   * - `['new']`
   * - `['new', 'DASHBOARD_TO_DASHBOARD_DRILLDOWN']`
   * - `['manage']`
   * - `['edit', 'yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy']`
   */
  public readonly route$: BehaviorSubject<string[]>;

  /**
   * Whether a drilldowns welcome message should be displayed to the user at
   * the very top of the drilldowns manager flyout.
   */
  public readonly hideWelcomeMessage$: BehaviorSubject<boolean>;

  /**
   * Currently selected action factory (drilldown type).
   */
  public readonly actionFactory$ = new BehaviorSubject<undefined | ActionFactory>(undefined);

  private readonly mapEventToDrilldownItem = (event: SerializedEvent): DrilldownListItem => {
    const actionFactory = this.deps.actionFactories.find(
      (factory) => factory.id === event.action.factoryId
    );
    const drilldownFactoryContext: BaseActionFactoryContext = {
      ...this.deps.placeContext,
      triggers: event.triggers as string[],
    };
    return {
      id: event.eventId,
      drilldownName: event.action.name,
      actionName: actionFactory?.getDisplayName(drilldownFactoryContext) ?? event.action.factoryId,
      icon: actionFactory?.getIconType(drilldownFactoryContext),
      error: !actionFactory
        ? invalidDrilldownType(event.action.factoryId) // this shouldn't happen for the end user, but useful during development
        : !actionFactory.isCompatibleLicense()
        ? insufficientLicenseLevel
        : undefined,
      triggers: event.triggers.map((trigger) => this.deps.getTrigger(trigger as string)),
    };
  };
  public readonly events$ = new BehaviorSubject<DrilldownListItem[]>(
    this.deps.dynamicActionManager.state.get().events.map(this.mapEventToDrilldownItem)
  );

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
    const hideWelcomeMessage = deps.storage.get(helloMessageStorageKey);
    this.hideWelcomeMessage$ = new BehaviorSubject<boolean>(hideWelcomeMessage ?? false);
    this.canUnlockMoreDrilldowns = deps.actionFactories.some(
      (factory) => !factory.isCompatibleLicense
    );

    deps.dynamicActionManager.state.state$
      .pipe(map((state) => state.events.map(this.mapEventToDrilldownItem)))
      .subscribe(this.events$);

    let { initialRoute = '' } = deps;
    if (!initialRoute) initialRoute = 'manage';
    else if (initialRoute[0] === '/') initialRoute = initialRoute.substr(1);
    this.route$ = new BehaviorSubject(initialRoute.split('/'));
  }

  /**
   * Set flyout main heading text.
   * @param title New title.
   */
  public setTitle(title: React.ReactNode) {
    this.title$.next(title);
  }

  /**
   * Set the new flyout footer that renders at the very bottom of the Drilldown
   * Manager flyout.
   * @param footer New title.
   */
  public setFooter(footer: React.ReactNode) {
    this.footer$.next(footer);
  }

  /**
   * Set the flyout main heading back to its default state.
   */
  public resetTitle() {
    this.setTitle(txtDefaultTitle);
  }

  /**
   * Change the screen of Drilldown Manager.
   */
  public setRoute(route: string[]): void {
    this.route$.next(route);
  }

  /**
   * Callback called to hide drilldowns welcome message, and remember in local
   * storage that user opted to hide this message.
   */
  public readonly hideWelcomeMessage = (): void => {
    this.hideWelcomeMessage$.next(true);
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

  /**
   * Callback called when user presses "Create drilldown" button to save the
   * currently edited drilldown.
   */
  public readonly onCreateDrilldown = (): void => {
    const { dynamicActionManager, toastService } = this.deps;
    const drilldownState = this.getDrilldownState();

    if (!drilldownState) return;

    (async () => {
      try {
        await dynamicActionManager.createEvent(
          drilldownState.serialize(),
          drilldownState.triggers$.getValue()
        );
        toastService.addSuccess({
          title: toastDrilldownCreated.title(drilldownState.name$.getValue()),
          text: toastDrilldownCreated.text,
        });
        this.setRoute(['manage']);
      } catch (error) {
        toastService.addError(error, {
          title: toastDrilldownsCRUDError,
        });
      }
    })();
  };

  // Below are convenience React hooks for consuming observables in connected
  // React components.

  /* eslint-disable react-hooks/rules-of-hooks */
  public readonly useTitle = () => useObservable(this.title$, this.title$.getValue());
  public readonly useFooter = () => useObservable(this.footer$, this.footer$.getValue());
  public readonly useRoute = () => useObservable(this.route$, this.route$.getValue());
  public readonly useWelcomeMessage = () =>
    useObservable(this.hideWelcomeMessage$, this.hideWelcomeMessage$.getValue());
  public readonly useActionFactory = () =>
    useObservable(this.actionFactory$, this.actionFactory$.getValue());
  public readonly useEvents = () => useObservable(this.events$, this.events$.getValue());
  /* eslint-enable react-hooks/rules-of-hooks */
}
