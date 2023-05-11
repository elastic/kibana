/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { ExecutionContextStart } from '@kbn/core-execution-context-browser';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { SharePluginStart, SharePluginSetup } from '@kbn/share-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { EmbeddableSetup, EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { DiscoverSetup, DiscoverStart } from '@kbn/discover-plugin/public';

export interface AiopsPluginSetupDeps {
  embeddable: EmbeddableSetup;
  share: SharePluginSetup;
  discover: DiscoverSetup;
}

export interface AiopsPluginStartDeps {
  charts: ChartsPluginStart;
  data: DataPublicPluginStart;
  discover: DiscoverStart;
  embeddable: EmbeddableStart;
  executionContext: ExecutionContextStart;
  fieldFormats: FieldFormatsStart;
  lens: LensPublicStart;
  licensing: LicensingPluginStart;
  share: SharePluginStart;
  storage: IStorageWrapper;
  uiActions: UiActionsStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
}

/**
 * aiops plugin server setup contract
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AiopsPluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AiopsPluginStart {}
