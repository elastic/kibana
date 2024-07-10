/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/public';

import { InvestigatePlugin } from './plugin';
import type {
  InvestigatePublicSetup,
  InvestigatePublicStart,
  InvestigateSetupDependencies,
  InvestigateStartDependencies,
  ConfigSchema,
  OnWidgetAdd,
  WidgetRenderAPI,
} from './types';

export type { InvestigatePublicSetup, InvestigatePublicStart, OnWidgetAdd, WidgetRenderAPI };

export {
  type Investigation,
  type InvestigationRevision,
  type InvestigateWidget,
  type InvestigateWidgetCreate,
  InvestigateWidgetColumnSpan,
  type GlobalWidgetParameters,
  type WorkflowBlock,
} from '../common/types';

export { mergePlainObjects } from '../common/utils/merge_plain_objects';

export { ChromeOption } from './types';

export { createWidgetFactory } from './create_widget';
export { getEsFilterFromGlobalParameters } from './util/get_es_filters_from_global_parameters';

export { ESQL_WIDGET_NAME } from './esql_widget/constants';
export { createEsqlWidget } from './esql_widget/create_esql_widget';
export type { EsqlWidgetParameters } from './esql_widget/types';

export const plugin: PluginInitializer<
  InvestigatePublicSetup,
  InvestigatePublicStart,
  InvestigateSetupDependencies,
  InvestigateStartDependencies
> = (pluginInitializerContext: PluginInitializerContext<ConfigSchema>) =>
  new InvestigatePlugin(pluginInitializerContext);
