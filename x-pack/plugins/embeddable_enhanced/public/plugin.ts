/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreStart, CoreSetup, Plugin, PluginInitializerContext } from 'src/core/public';
import { SavedObjectAttributes } from 'kibana/public';
import {
  EmbeddableFactory,
  EmbeddableFactoryDefinition,
  EmbeddableInput,
  EmbeddableOutput,
  EmbeddableSetup,
  EmbeddableStart,
  IEmbeddable,
  defaultEmbeddableFactoryProvider,
  EmbeddableContext,
  PANEL_NOTIFICATION_TRIGGER,
  ViewMode,
} from '../../../../src/plugins/embeddable/public';
import { EnhancedEmbeddable, EnhancedEmbeddableContext } from './types';
import {
  EmbeddableActionStorage,
  EmbeddableWithDynamicActions,
} from './embeddables/embeddable_action_storage';
import {
  UiActionsEnhancedDynamicActionManager as DynamicActionManager,
  AdvancedUiActionsSetup,
  AdvancedUiActionsStart,
} from '../../ui_actions_enhanced/public';
import { PanelNotificationsAction, ACTION_PANEL_NOTIFICATIONS } from './actions';

declare module '../../../../src/plugins/ui_actions/public' {
  export interface ActionContextMapping {
    [ACTION_PANEL_NOTIFICATIONS]: EnhancedEmbeddableContext;
  }
}

export interface SetupDependencies {
  embeddable: EmbeddableSetup;
  uiActionsEnhanced: AdvancedUiActionsSetup;
}

export interface StartDependencies {
  embeddable: EmbeddableStart;
  uiActionsEnhanced: AdvancedUiActionsStart;
}

// eslint-disable-next-line
export interface SetupContract {}

// eslint-disable-next-line
export interface StartContract {}

export class EmbeddableEnhancedPlugin
  implements Plugin<SetupContract, StartContract, SetupDependencies, StartDependencies> {
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

    return {};
  }

  public stop() {}

  private setCustomEmbeddableFactoryProvider(plugins: SetupDependencies) {
    plugins.embeddable.setCustomEmbeddableFactoryProvider(
      <
        I extends EmbeddableInput = EmbeddableInput,
        O extends EmbeddableOutput = EmbeddableOutput,
        E extends IEmbeddable<I, O> = IEmbeddable<I, O>,
        T extends SavedObjectAttributes = SavedObjectAttributes
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

  private enhanceEmbeddableWithDynamicActions<E extends IEmbeddable>(
    embeddable: E
  ): EnhancedEmbeddable<E> {
    const enhancedEmbeddable = embeddable as EnhancedEmbeddable<E>;

    const storage = new EmbeddableActionStorage(embeddable as EmbeddableWithDynamicActions);
    const dynamicActions = new DynamicActionManager({
      isCompatible: async (context: unknown) => {
        if (!this.isEmbeddableContext(context)) return false;
        if (context.embeddable.getInput().viewMode !== ViewMode.VIEW) return false;
        return context.embeddable.runtimeId === embeddable.runtimeId;
      },
      storage,
      uiActions: this.uiActions!,
    });

    dynamicActions.start().catch((error) => {
      /* eslint-disable */

      console.log('Failed to start embeddable dynamic actions', embeddable);
      console.error(error);
      /* eslint-enable */
    });

    const stop = () => {
      dynamicActions.stop().catch((error) => {
        /* eslint-disable */

        console.log('Failed to stop embeddable dynamic actions', embeddable);
        console.error(error);
        /* eslint-enable */
      });
    };

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

    return enhancedEmbeddable;
  }
}
