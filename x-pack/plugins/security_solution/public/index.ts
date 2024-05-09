/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PluginInitializerContext } from '@kbn/core/public';

import { Plugin } from './plugin';
import type { PluginSetup, PluginStart } from './types';
export type { TimelineModel } from './timelines/store/model';
export type { LinkItem } from './common/links';
export type { FetchRulesResponse } from './detection_engine/rule_management/logic/types';

export const plugin = (context: PluginInitializerContext): Plugin => new Plugin(context);

export type { PluginSetup, PluginStart };
export { Plugin };

export {
  CreateProjectSteps,
  OverviewSteps,
  AddIntegrationsSteps,
  ViewDashboardSteps,
  EnablePrebuiltRulesSteps,
  ViewAlertsSteps,
} from './common/components/landing_page/onboarding/types';
