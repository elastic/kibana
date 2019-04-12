/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  actionRegistry,
  CONTEXT_MENU_TRIGGER,
  triggerRegistry,
} from '../../../../src/legacy/core_plugins/embeddable_api/public';

import { CUSTOMIZE_EVENTS_ACTION, CustomizeEventsAction } from './customize_events';
import { actionFactoryRegistry } from './dynamic_actions';
import {
  ApplyTimeRangeActionFactory,
  CustomizeTimeRangeAction,
  CUSTOMIZE_TIME_RANGE,
} from './customize_time_range';
import { DashboardDrilldownActionFactory } from './navigate_action/dashboard_drilldown_action_factory';
import { NavigateActionFactory } from './navigate_action/navigate_action_factory';

import { ADD_NAVIGATE_ACTION, AddNavigateAction } from './navigate_action';

actionRegistry.addAction(new CustomizeTimeRangeAction());
actionRegistry.addAction(new AddNavigateAction());
actionRegistry.addAction(new CustomizeEventsAction());

actionFactoryRegistry.registerActionFactory(new ApplyTimeRangeActionFactory());
actionFactoryRegistry.registerActionFactory(new NavigateActionFactory());
actionFactoryRegistry.registerActionFactory(new DashboardDrilldownActionFactory());

triggerRegistry.attachAction({
  triggerId: CONTEXT_MENU_TRIGGER,
  actionId: CUSTOMIZE_EVENTS_ACTION,
});

triggerRegistry.attachAction({
  triggerId: CONTEXT_MENU_TRIGGER,
  actionId: ADD_NAVIGATE_ACTION,
});

triggerRegistry.attachAction({
  triggerId: CONTEXT_MENU_TRIGGER,
  actionId: CUSTOMIZE_TIME_RANGE,
});
