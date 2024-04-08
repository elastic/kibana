/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import {
  defaultEmbeddableFactoryProvider,
  EmbeddableContext,
  EmbeddableFactory,
  EmbeddableFactoryDefinition,
  EmbeddableInput,
  EmbeddableOutput,
  EmbeddableSetup,
  EmbeddableStart,
  IEmbeddable,
  PANEL_NOTIFICATION_TRIGGER,
} from '@kbn/embeddable-plugin/public';
import {
  apiHasUniqueId,
  EmbeddableApiContext,
  StateComparators,
} from '@kbn/presentation-publishing';
import type { FinderAttributes } from '@kbn/saved-objects-finder-plugin/common';
import {
  AdvancedUiActionsSetup,
  AdvancedUiActionsStart,
  DynamicActionsState,
  UiActionsEnhancedDynamicActionManager as DynamicActionManager,
} from '@kbn/ui-actions-enhanced-plugin/public';
import deepEqual from 'react-fast-compare';
import { BehaviorSubject, distinctUntilChanged } from 'rxjs';
import { PanelNotificationsAction } from './actions';
import {
  DynamicActionStorage,
  type DynamicActionStorageApi,
} from './embeddables/dynamic_action_storage';
import { HasDynamicActions } from './embeddables/interfaces/has_dynamic_actions';
import { EnhancedEmbeddable } from './types';

export interface SetupDependencies {
  embeddable: EmbeddableSetup;
  uiActionsEnhanced: AdvancedUiActionsSetup;
}

export interface StartDependencies {
  embeddable: EmbeddableStart;
  uiActionsEnhanced: AdvancedUiActionsStart;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SetupContract {}

export interface ReactEmbeddableDynamicActionsApi {
  dynamicActionsApi: HasDynamicActions;
  dynamicActionsComparator: StateComparators<DynamicActionsSerializedState>;
  serializeDynamicActions: () => DynamicActionsSerializedState;
  startDynamicActions: () => { stopDynamicActions: () => void };
}

export interface StartContract {
  initializeReactEmbeddableDynamicActions: (
    uuid: string,
    getTitle: () => string | undefined,
    state: DynamicActionsSerializedState
  ) => ReactEmbeddableDynamicActionsApi;
}

export interface DynamicActionsSerializedState {
  enhancements?: { dynamicActions: DynamicActionsState };
}

export class EmbeddableEnhancedPlugin
  implements Plugin<SetupContract, StartContract, SetupDependencies, StartDependencies>
{
  constructor(protected readonly context: PluginInitializerContext) {}

  private uiActions?: StartDependencies['uiActionsEnhanced'];

  public setup(core: CoreSetup<StartDependencies>, plugins: SetupDependencies): SetupContract {
    this.setCustomEmbeddableFactoryProvider(plugins);
    const panelNotificationAction = new PanelNotificationsAction();
    plugins.uiActionsEnhanced.registerAction(panelNotificationAction);
    plugins.uiActionsEnhanced.attachAction(PANEL_NOTIFICATION_TRIGGER, panelNotificationAction.id);

    return {};
  }

  public start(core: CoreStart, plugins: StartDependencies): StartContract {
    this.uiActions = plugins.uiActionsEnhanced;

    return {
      initializeReactEmbeddableDynamicActions: this.initializeDynamicActions.bind(this),
    };
  }

  public stop() {}

  private setCustomEmbeddableFactoryProvider(plugins: SetupDependencies) {
    plugins.embeddable.setCustomEmbeddableFactoryProvider(
      <
        I extends EmbeddableInput = EmbeddableInput,
        O extends EmbeddableOutput = EmbeddableOutput,
        E extends IEmbeddable<I, O> = IEmbeddable<I, O>,
        T extends FinderAttributes = {}
      >(
        def: EmbeddableFactoryDefinition<I, O, E, T>
      ): EmbeddableFactory<I, O, E, T> => {
        const factory: EmbeddableFactory<I, O, E, T> = defaultEmbeddableFactoryProvider<I, O, E, T>(
          def
        );
        return {
          ...factory,
          create: async (...args) => {
            const embeddable = await factory.create(...args);
            if (!embeddable) return embeddable;
            return this.enhanceEmbeddableWithDynamicActions(embeddable);
          },
          createFromSavedObject: async (...args) => {
            const embeddable = await factory.createFromSavedObject(...args);
            if (!embeddable) return embeddable;
            return this.enhanceEmbeddableWithDynamicActions(embeddable);
          },
        };
      }
    );
  }

  private readonly isEmbeddableContext = (context: unknown): context is EmbeddableContext => {
    if (!(context as EmbeddableContext)?.embeddable) {
      // eslint-disable-next-line no-console
      console.warn('For drilldowns to work action context should contain .embeddable field.');
      return false;
    }
    return true;
  };

  private initializeDynamicActions(
    uuid: string,
    getTitle: () => string | undefined,
    state: DynamicActionsSerializedState
  ): {
    dynamicActionsApi: HasDynamicActions;
    dynamicActionsComparator: StateComparators<DynamicActionsSerializedState>;
    serializeDynamicActions: () => DynamicActionsSerializedState;
    startDynamicActions: () => { stopDynamicActions: () => void };
  } {
    const dynamicActionsState$ = new BehaviorSubject<DynamicActionsSerializedState['enhancements']>(
      { dynamicActions: { events: [] }, ...(state.enhancements ?? {}) }
    );
    const api: DynamicActionStorageApi = {
      dynamicActionsState$,
      setDynamicActions: (newState) => {
        dynamicActionsState$.next(newState);
      },
    };
    const storage = new DynamicActionStorage(uuid, getTitle, api);
    const dynamicActions = new DynamicActionManager({
      isCompatible: async (context: EmbeddableApiContext) => {
        const { embeddable } = context;
        return apiHasUniqueId(embeddable) && embeddable.uuid === uuid;
      },
      storage,
      uiActions: this.uiActions!,
    });

    return {
      dynamicActionsApi: { ...api, enhancements: { dynamicActions } },
      dynamicActionsComparator: {
        enhancements: [
          dynamicActionsState$,
          api.setDynamicActions,
          (a, b) => {
            return deepEqual(a, b);
          },
        ],
      },
      serializeDynamicActions: () => {
        return { enhancements: dynamicActionsState$.getValue() };
      },
      startDynamicActions: () => {
        const stop = this.startDynamicActions(dynamicActions);
        return { stopDynamicActions: stop };
      },
    };
  }

  /**
   * TODO: Remove this entire enhanceEmbeddableWithDynamicActions method once the embeddable refactor work is complete
   */
  private enhanceEmbeddableWithDynamicActions<E extends IEmbeddable>(
    embeddable: E
  ): EnhancedEmbeddable<E> {
    const enhancedEmbeddable = embeddable as EnhancedEmbeddable<E>;

    const dynamicActionsState$ = new BehaviorSubject<DynamicActionsSerializedState['enhancements']>(
      {
        dynamicActions: { events: [] },
        ...(embeddable.getInput().enhancements ?? {}),
      }
    );
    const api = {
      dynamicActionsState$,
      setDynamicActions: (newState: DynamicActionsSerializedState['enhancements']) => {
        embeddable.updateInput({ enhancements: newState });
      },
    };

    /**
     * Keep the dynamicActionsState$ publishing subject in sync with changes to the embeddable's input.
     */
    embeddable
      .getInput$()
      .pipe(
        distinctUntilChanged(({ enhancements: old }, { enhancements: updated }) =>
          deepEqual(old, updated)
        )
      )
      .subscribe((input) => {
        dynamicActionsState$.next({
          dynamicActions: { events: [] },
          ...(input.enhancements ?? {}),
        } as DynamicActionsSerializedState['enhancements']);
      });

    const storage = new DynamicActionStorage(
      String(embeddable.runtimeId),
      embeddable.getTitle,
      api
    );
    const dynamicActions = new DynamicActionManager({
      isCompatible: async (context: unknown) => {
        if (!this.isEmbeddableContext(context)) return false;
        return context.embeddable.runtimeId === embeddable.runtimeId;
      },
      storage,
      uiActions: this.uiActions!,
    });

    const stop = this.startDynamicActions(dynamicActions);
    embeddable.getInput$().subscribe({
      next: () => {
        storage.reload$.next();
      },
      error: stop,
      complete: stop,
    });

    enhancedEmbeddable.enhancements = {
      ...enhancedEmbeddable.enhancements,
      dynamicActions,
    };
    enhancedEmbeddable.dynamicActionsState$ = api.dynamicActionsState$;
    enhancedEmbeddable.setDynamicActions = api.setDynamicActions;

    return enhancedEmbeddable;
  }

  private startDynamicActions(dynamicActions: DynamicActionManager) {
    dynamicActions.start().catch((error) => {
      /* eslint-disable no-console */

      console.log('Failed to start embeddable dynamic actions', dynamicActions);
      console.error(error);
      /* eslint-enable */
    });

    const stop = () => {
      dynamicActions.stop().catch((error) => {
        /* eslint-disable no-console */

        console.log('Failed to stop embeddable dynamic actions', dynamicActions);
        console.error(error);
        /* eslint-enable */
      });
    };

    return stop;
  }
}
