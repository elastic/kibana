/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreStart } from 'src/core/public';
import { SharePluginStart } from 'src/plugins/share/public';
import { DrilldownFactoryContext } from '../../../../../drilldowns/public';
import {
  EmbeddableVisTriggerContext,
  EmbeddableContext,
  IEmbeddable,
} from '../../../../../../../src/plugins/embeddable/public';
import { UiActionsCollectConfigProps } from '../../../../../../../src/plugins/ui_actions/public';

export type PlaceContext = EmbeddableContext;
export type ActionContext<T extends IEmbeddable = IEmbeddable> = EmbeddableVisTriggerContext<T>;

export interface Config {
  dashboardId?: string;
  useCurrentFilters: boolean;
  useCurrentDateRange: boolean;
}

export interface CollectConfigProps extends UiActionsCollectConfigProps<Config> {
  deps: {
    getSavedObjectsClient: () => Promise<CoreStart['savedObjects']['client']>;
    getNavigateToApp: () => Promise<CoreStart['application']['navigateToApp']>;
    getGetUrlGenerator: () => Promise<SharePluginStart['urlGenerators']['getUrlGenerator']>;
  };
  context: DrilldownFactoryContext<{
    embeddable: IEmbeddable;
  }>;
}
