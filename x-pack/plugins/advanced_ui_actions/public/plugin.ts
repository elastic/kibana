/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
} from '../../../../src/core/public';
import { createReactOverlays } from '../../../../src/plugins/kibana_react/public';
import { UiActionsStart, UiActionsSetup } from '../../../../src/plugins/ui_actions/public';
import {
  CONTEXT_MENU_TRIGGER,
  PANEL_BADGE_TRIGGER,
  IEmbeddableSetup,
  IEmbeddableStart,
} from '../../../../src/plugins/embeddable/public';
import {
  CustomTimeRangeAction,
  CUSTOM_TIME_RANGE,
  TimeRangeActionContext,
} from './custom_time_range_action';

import {
  CustomTimeRangeBadge,
  CUSTOM_TIME_RANGE_BADGE,
  TimeBadgeActionContext,
} from './custom_time_range_badge';
import { CommonlyUsedRange } from './types';
import { UiActionsFactoryService } from './ui_actions_factory';

interface SetupDependencies {
  embeddable: IEmbeddableSetup; // Embeddable are needed because they register basic triggers/actions.
  uiActions: UiActionsSetup;
}

interface StartDependencies {
  embeddable: IEmbeddableStart;
  uiActions: UiActionsStart;
}

export interface AdvancedUiActionsSetup {
  actionFactory: Pick<UiActionsFactoryService, 'register' | 'getAll'>;
}
export interface AdvancedUiActionsStart {
  actionFactory: Pick<UiActionsFactoryService, 'register' | 'getAll'>;
}

declare module '../../../../src/plugins/ui_actions/public' {
  export interface ActionContextMapping {
    [CUSTOM_TIME_RANGE]: TimeRangeActionContext;
    [CUSTOM_TIME_RANGE_BADGE]: TimeBadgeActionContext;
  }
}

export class AdvancedUiActionsPublicPlugin
  implements
    Plugin<AdvancedUiActionsSetup, AdvancedUiActionsStart, SetupDependencies, StartDependencies> {
  private readonly actionFactoryService = new UiActionsFactoryService();

  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup, { uiActions }: SetupDependencies): AdvancedUiActionsSetup {
    return {
      actionFactory: this.actionFactoryService,
    };
  }

  public start(core: CoreStart, { uiActions }: StartDependencies): AdvancedUiActionsStart {
    const dateFormat = core.uiSettings.get('dateFormat') as string;
    const commonlyUsedRanges = core.uiSettings.get('timepicker:quickRanges') as CommonlyUsedRange[];
    const { openModal } = createReactOverlays(core);
    const timeRangeAction = new CustomTimeRangeAction({
      openModal,
      dateFormat,
      commonlyUsedRanges,
    });
    uiActions.registerAction(timeRangeAction);
    uiActions.attachAction(CONTEXT_MENU_TRIGGER, timeRangeAction);

    const timeRangeBadge = new CustomTimeRangeBadge({
      openModal,
      dateFormat,
      commonlyUsedRanges,
    });
    uiActions.registerAction(timeRangeBadge);
    uiActions.attachAction(PANEL_BADGE_TRIGGER, timeRangeBadge);

    return {
      actionFactory: this.actionFactoryService,
    };
  }

  public stop() {
    this.actionFactoryService.clear();
  }
}
