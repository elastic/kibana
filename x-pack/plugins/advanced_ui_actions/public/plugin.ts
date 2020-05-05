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
import { UiActionsSetup, UiActionsStart } from '../../../../src/plugins/ui_actions/public';
import {
  CONTEXT_MENU_TRIGGER,
  PANEL_BADGE_TRIGGER,
  EmbeddableSetup,
  EmbeddableStart,
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
import { UiActionsServiceEnhancements } from './services';

interface SetupDependencies {
  embeddable: EmbeddableSetup; // Embeddable are needed because they register basic triggers/actions.
  uiActions: UiActionsSetup;
}

interface StartDependencies {
  embeddable: EmbeddableStart;
  uiActions: UiActionsStart;
}

export interface SetupContract
  extends UiActionsSetup,
    Pick<UiActionsServiceEnhancements, 'registerDrilldown'> {}

export interface StartContract
  extends UiActionsStart,
    Pick<UiActionsServiceEnhancements, 'getActionFactory' | 'getActionFactories'> {}

declare module '../../../../src/plugins/ui_actions/public' {
  export interface ActionContextMapping {
    [CUSTOM_TIME_RANGE]: TimeRangeActionContext;
    [CUSTOM_TIME_RANGE_BADGE]: TimeBadgeActionContext;
  }
}

export class AdvancedUiActionsPublicPlugin
  implements Plugin<SetupContract, StartContract, SetupDependencies, StartDependencies> {
  private readonly enhancements = new UiActionsServiceEnhancements();

  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup, { uiActions }: SetupDependencies): SetupContract {
    return {
      ...uiActions,
      ...this.enhancements,
    };
  }

  public start(core: CoreStart, { uiActions }: StartDependencies): StartContract {
    const dateFormat = core.uiSettings.get('dateFormat') as string;
    const commonlyUsedRanges = core.uiSettings.get('timepicker:quickRanges') as CommonlyUsedRange[];
    const { openModal } = createReactOverlays(core);
    const timeRangeAction = new CustomTimeRangeAction({
      openModal,
      dateFormat,
      commonlyUsedRanges,
    });
    uiActions.addTriggerAction(CONTEXT_MENU_TRIGGER, timeRangeAction);

    const timeRangeBadge = new CustomTimeRangeBadge({
      openModal,
      dateFormat,
      commonlyUsedRanges,
    });
    uiActions.addTriggerAction(PANEL_BADGE_TRIGGER, timeRangeBadge);

    return {
      ...uiActions,
      ...this.enhancements,
    };
  }

  public stop() {}
}
