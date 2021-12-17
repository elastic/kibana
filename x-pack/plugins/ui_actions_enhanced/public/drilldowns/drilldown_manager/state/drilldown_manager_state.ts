/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useObservable from 'react-use/lib/useObservable';
import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import type { SerializableRecord } from '@kbn/utility-types';
import {
  PublicDrilldownManagerProps,
  DrilldownManagerDependencies,
  DrilldownTemplate,
} from '../types';
import {
  ActionFactory,
  BaseActionFactoryContext,
  SerializedAction,
  SerializedEvent,
} from '../../../dynamic_actions';
import { DrilldownState } from './drilldown_state';
import {
  toastDrilldownCreated,
  toastDrilldownsCRUDError,
  insufficientLicenseLevel,
  invalidDrilldownType,
  txtDefaultTitle,
  toastDrilldownDeleted,
  toastDrilldownsDeleted,
  toastDrilldownEdited,
} from './i18n';
import { DrilldownTableItem } from '../components/drilldown_table';

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
   * - `['manage', 'yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy']`
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
  public readonly actionFactory$: BehaviorSubject<undefined | ActionFactory>;

  private readonly mapEventToDrilldownItem = (event: SerializedEvent): DrilldownTableItem => {
    const actionFactory = this.deps.actionFactories.find(
      (factory) => factory.id === event.action.factoryId
    );
    const drilldownFactoryContext: BaseActionFactoryContext = {
      ...this.deps.placeContext,
      triggers: event.triggers as string[],
    };
    const firstTrigger = event.triggers[0];
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
      triggerIncompatible: !this.deps.triggers.find((t) => t === firstTrigger),
    };
  };
  public readonly events$: BehaviorSubject<DrilldownTableItem[]>;

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

  /**
   * Used to show cloning success notification.
   */
  public lastCloneRecord: null | { time: number; templateIds: string[] } = null;

  constructor(public readonly deps: DrilldownManagerStateDeps) {
    const hideWelcomeMessage = deps.storage.get(helloMessageStorageKey);
    this.hideWelcomeMessage$ = new BehaviorSubject<boolean>(hideWelcomeMessage ?? false);
    this.canUnlockMoreDrilldowns = deps.actionFactories.some(
      (factory) => !factory.isCompatibleLicense
    );

    this.events$ = new BehaviorSubject<DrilldownTableItem[]>(
      this.deps.dynamicActionManager.state.get().events.map(this.mapEventToDrilldownItem)
    );

    deps.dynamicActionManager.state.state$
      .pipe(map((state) => state.events.map(this.mapEventToDrilldownItem)))
      .subscribe(this.events$);

    let { initialRoute = '' } = deps;
    if (!initialRoute) initialRoute = 'manage';
    else if (initialRoute[0] === '/') initialRoute = initialRoute.substr(1);
    this.route$ = new BehaviorSubject(initialRoute.split('/'));

    this.actionFactory$ = new BehaviorSubject<undefined | ActionFactory>(
      this.getActiveActionFactory()
    );
    this.route$.pipe(map(() => this.getActiveActionFactory())).subscribe(this.actionFactory$);
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
    if (route[0] === 'manage') this.deps.closeAfterCreate = false;
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
      const route = this.route$.getValue();
      if (route[0] === 'new' && route.length > 1) this.setRoute(['new']);
      return;
    }

    if (!this.drilldownStateByFactoryId.has(actionFactory.id)) {
      const oldActionFactory = this.getActiveActionFactory();
      const oldDrilldownState = !!oldActionFactory
        ? this.drilldownStateByFactoryId.get(oldActionFactory.id)
        : undefined;
      const context = this.getActionFactoryContext();
      const drilldownState = new DrilldownState({
        factory: actionFactory,
        placeTriggers: this.deps.triggers,
        placeContext: this.deps.placeContext || {},
        name: this.pickName(
          !!oldDrilldownState
            ? oldDrilldownState.name$.getValue()
            : actionFactory.getDisplayName(this.getActionFactoryContext())
        ),
        triggers: [],
        config: actionFactory.createConfig(context),
      });
      this.drilldownStateByFactoryId.set(actionFactory.id, drilldownState);
    }

    this.route$.next(['new', actionFactory.id]);
  }

  public getActiveActionFactory(): undefined | ActionFactory {
    const [step1, id] = this.route$.getValue();
    if (step1 !== 'new' || !id) return undefined;
    return this.deps.actionFactories.find((factory) => factory.id === id);
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
    const actionFactory = this.getActiveActionFactory();
    if (!actionFactory) return undefined;
    const drilldownState = this.drilldownStateByFactoryId.get(actionFactory.id);
    return drilldownState;
  }

  /**
   * Called when user presses "Create drilldown" button to save the
   * currently edited drilldown.
   */
  public async createDrilldown(): Promise<void> {
    const { dynamicActionManager, toastService } = this.deps;
    const drilldownState = this.getDrilldownState();

    if (!drilldownState) return;

    try {
      const event = drilldownState.serialize();
      const triggers = drilldownState.triggers$.getValue();

      await dynamicActionManager.createEvent(event, triggers);
      toastService.addSuccess({
        title: toastDrilldownCreated.title(drilldownState.name$.getValue()),
        text: toastDrilldownCreated.text,
      });
      this.drilldownStateByFactoryId.delete(drilldownState.factory.id);
      if (this.deps.closeAfterCreate) {
        this.deps.onClose();
      } else {
        this.setRoute(['manage']);
      }
    } catch (error) {
      toastService.addError(error, {
        title: toastDrilldownsCRUDError,
      });
      throw error;
    }
  }

  /**
   * Deletes a list of drilldowns and shows toast notifications to the user.
   *
   * @param ids Drilldown IDs.
   */
  public readonly onDelete = (ids: string[]) => {
    (async () => {
      const { dynamicActionManager, toastService } = this.deps;
      try {
        await dynamicActionManager.deleteEvents(ids);
        this.deps.toastService.addSuccess(
          ids.length === 1
            ? {
                title: toastDrilldownDeleted.title,
                text: toastDrilldownDeleted.text,
              }
            : {
                title: toastDrilldownsDeleted.title(ids.length),
                text: toastDrilldownsDeleted.text,
              }
        );
      } catch (error) {
        toastService.addError(error, {
          title: toastDrilldownsCRUDError,
        });
      }
    })().catch(console.error); // eslint-disable-line
  };

  /**
   * Clone a list of selected templates.
   */
  public readonly onClone = async (templateIds: string[]) => {
    const { templates } = this.deps;
    if (!templates) return;
    const templatesToClone: DrilldownTemplate[] = templateIds
      .map((templateId) => templates.find(({ id }) => id === templateId))
      .filter(Boolean) as DrilldownTemplate[];

    for (const template of templatesToClone) {
      await this.cloneTemplate(template);
    }

    this.lastCloneRecord = {
      time: Date.now(),
      templateIds,
    };
    this.setRoute(['manage']);
  };

  private async cloneTemplate(template: DrilldownTemplate) {
    const { dynamicActionManager } = this.deps;
    const name = this.pickName(template.name);
    const action: SerializedAction = {
      factoryId: template.factoryId,
      name,
      config: (template.config || {}) as SerializableRecord,
    };
    await dynamicActionManager.createEvent(action, template.triggers);
  }

  /**
   * Checks if drilldown with such a name already exists.
   */
  private hasDrilldownWithName(name: string): boolean {
    const { events } = this.deps.dynamicActionManager.state.get();
    for (const event of events) if (event.action.name === name) return true;
    return false;
  }

  /**
   * Picks a unique name for the cloned drilldown. Adds "(copy)", "(copy 1)",
   * "(copy 2)", etc. if drilldown with such name already exists.
   */
  private pickName(name: string): string {
    if (this.hasDrilldownWithName(name)) {
      const matches = name.match(/(.*) (\(copy[^\)]*\))/);
      if (matches) name = matches[1];
      for (let i = 0; i < 100; i++) {
        const proposedName = !i ? `${name} (copy)` : `${name} (copy ${i})`;
        const exists = this.hasDrilldownWithName(proposedName);
        if (!exists) return proposedName;
      }
    }
    return name;
  }

  public readonly onCreateFromTemplate = async (templateId: string) => {
    const { templates } = this.deps;
    if (!templates) return;
    const template = templates.find(({ id }) => id === templateId);
    if (!template) return;
    const actionFactory = this.deps.actionFactories.find(({ id }) => id === template.factoryId);
    if (!actionFactory) return;
    this.setActionFactory(actionFactory);
    const drilldownState = this.getDrilldownState();
    if (drilldownState) {
      drilldownState.setName(this.pickName(template.name));
      drilldownState.setTriggers(template.triggers);
      drilldownState.setConfig(template.config as SerializableRecord);
    }
  };

  public readonly onCreateFromDrilldown = async (eventId: string) => {
    const { dynamicActionManager } = this.deps;
    const { events } = dynamicActionManager.state.get();
    const event = events.find((ev) => ev.eventId === eventId);
    if (!event) return;
    const actionFactory = this.deps.actionFactories.find(({ id }) => id === event.action.factoryId);
    if (!actionFactory) return;
    this.setActionFactory(actionFactory);
    const drilldownState = this.getDrilldownState();
    if (drilldownState) {
      drilldownState.setName(this.pickName(event.action.name));
      drilldownState.setTriggers(event.triggers);
      drilldownState.setConfig(event.action.config);
    }
  };

  /**
   * Returns the state object of an existing drilldown for editing purposes.
   *
   * @param eventId ID of the saved dynamic action event.
   */
  public createEventDrilldownState(eventId: string): null | DrilldownState {
    const { dynamicActionManager, actionFactories, triggers: placeTriggers } = this.deps;
    const { events } = dynamicActionManager.state.get();
    const event = events.find((ev) => ev.eventId === eventId);
    if (!event) return null;
    const factory = actionFactories.find(({ id }) => id === event.action.factoryId);
    if (!factory) return null;
    const { action, triggers } = event;
    const { name, config } = action;
    const state = new DrilldownState({
      factory,
      placeContext: this.getActionFactoryContext(),
      placeTriggers,
      name,
      config,
      triggers,
    });
    return state;
  }

  /**
   * Save edits to an existing drilldown.
   *
   * @param eventId ID of the saved dynamic action event.
   * @param drilldownState Latest state of the drilldown as edited by the user.
   */
  public async updateEvent(eventId: string, drilldownState: DrilldownState): Promise<void> {
    const { dynamicActionManager, toastService } = this.deps;
    const action = drilldownState.serialize();

    try {
      await dynamicActionManager.updateEvent(eventId, action, drilldownState.triggers$.getValue());
      toastService.addSuccess({
        title: toastDrilldownEdited.title(action.name),
        text: toastDrilldownEdited.text,
      });
      this.setRoute(['manage']);
    } catch (error) {
      toastService.addError(error, {
        title: toastDrilldownsCRUDError,
      });
      throw error;
    }
  }

  // Below are convenience React hooks for consuming observables in connected
  // React components.

  public readonly useTitle = () => useObservable(this.title$, this.title$.getValue());
  public readonly useFooter = () => useObservable(this.footer$, this.footer$.getValue());
  public readonly useRoute = () => useObservable(this.route$, this.route$.getValue());
  public readonly useWelcomeMessage = () =>
    useObservable(this.hideWelcomeMessage$, this.hideWelcomeMessage$.getValue());
  public readonly useActionFactory = () =>
    useObservable(this.actionFactory$, this.actionFactory$.getValue());
  public readonly useEvents = () => useObservable(this.events$, this.events$.getValue());
}
