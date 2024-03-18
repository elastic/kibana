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
import { EmbeddableStateComparators } from '@kbn/embeddable-plugin/public/react_embeddable_system/types';
import { apiHasUniqueId, HasUniqueId, PublishesPanelTitle } from '@kbn/presentation-publishing';
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
  ApiActionStorage,
  type DynamicActionStorageApi,
} from './embeddables/embeddable_action_storage';
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
export interface SerializedReactEmbeddableDynamicActions {
  title?: string;
  description?: string;
  hidePanelTitles?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SetupContract {}

export interface EmbeddableEnhancedPluginStart {
  initializeReactEmbeddableDynamicActions: (
    uuid: string,
    getTitle: () => string | undefined,
    state: DynamicActionsSerializedState
  ) => {
    dynamicActionsApi: HasDynamicActions;
    dynamicActionsComparator: EmbeddableStateComparators<DynamicActionsSerializedState>;
    serializeDynamicActions: () => DynamicActionsSerializedState;
  };
}

export type ReactEmbeddableDynamicActionsApi = HasDynamicActions &
  PublishesPanelTitle &
  HasUniqueId;

export interface DynamicActionsSerializedState {
  enhancements?: { dynamicActions: DynamicActionsState };
}

export class EmbeddableEnhancedPlugin
  implements
    Plugin<SetupContract, EmbeddableEnhancedPluginStart, SetupDependencies, StartDependencies>
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

  public start(core: CoreStart, plugins: StartDependencies): EmbeddableEnhancedPluginStart {
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
    dynamicActionsComparator: EmbeddableStateComparators<DynamicActionsSerializedState>;
    serializeDynamicActions: () => DynamicActionsSerializedState;
  } {
    const dynamicActionsState$ = new BehaviorSubject<DynamicActionsSerializedState['enhancements']>(
      state.enhancements
    );
    const api: DynamicActionStorageApi = {
      dynamicActionsState$,
      setDynamicActions: (newState) => dynamicActionsState$.next(newState),
    };
    const storage = new ApiActionStorage(uuid, getTitle, api);
    const dynamicActions = new DynamicActionManager({
      isCompatible: async (context: unknown) => {
        return apiHasUniqueId(context) && context.uuid === uuid;
      },
      storage,
      uiActions: this.uiActions!,
    });
    this.startDynamicActions({ ...api, enhancements: { dynamicActions } });

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
    };
  }

  private enhanceEmbeddableWithDynamicActions<E extends IEmbeddable>(
    embeddable: E
  ): EnhancedEmbeddable<E> {
    const enhancedEmbeddable = embeddable as EnhancedEmbeddable<E>;

    const dynamicActionsState$ = new BehaviorSubject<DynamicActionsSerializedState['enhancements']>(
      embeddable.getInput().enhancements as DynamicActionsSerializedState['enhancements']
    );
    const api = {
      dynamicActionsState$,
      setDynamicActions: (newState: DynamicActionsSerializedState['enhancements']) => {
        embeddable.updateInput({ enhancements: newState });
      },
    };

    embeddable
      .getInput$()
      .pipe(
        distinctUntilChanged(({ enhancements: old }, { enhancements: updated }) =>
          deepEqual(old, updated)
        )
      )
      .subscribe((input) => {
        dynamicActionsState$.next(
          input.enhancements as DynamicActionsSerializedState['enhancements']
        );
      });

    const storage = new ApiActionStorage(String(embeddable.runtimeId), embeddable.getTitle, api);
    const dynamicActions = new DynamicActionManager({
      isCompatible: async (context: unknown) => {
        if (!this.isEmbeddableContext(context)) return false;
        return context.embeddable.runtimeId === embeddable.runtimeId;
      },
      storage,
      uiActions: this.uiActions!,
    });

    const stop = this.startDynamicActions({ ...api, enhancements: { dynamicActions } });
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

  private startDynamicActions(api: HasDynamicActions) {
    api.enhancements.dynamicActions.start().catch((error) => {
      /* eslint-disable no-console */

      console.log('Failed to start embeddable dynamic actions', api);
      console.error(error);
      /* eslint-enable */
    });

    const stop = () => {
      api.enhancements.dynamicActions.stop().catch((error) => {
        /* eslint-disable no-console */

        console.log('Failed to stop embeddable dynamic actions', api);
        console.error(error);
        /* eslint-enable */
      });
    };

    return stop;
  }
}
