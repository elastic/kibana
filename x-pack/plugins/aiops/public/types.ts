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
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { UiActionsStart, UiActionsSetup } from '@kbn/ui-actions-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { EmbeddableSetup, EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { CasesUiSetup } from '@kbn/cases-plugin/public';
import { LicensingPluginSetup } from '@kbn/licensing-plugin/public';
import type { EmbeddableChangePointChartProps } from './embeddable';

export interface AiopsPluginSetupDeps {
  embeddable: EmbeddableSetup;
  cases: CasesUiSetup;
  licensing: LicensingPluginSetup;

  uiActions: UiActionsSetup;
}

export interface AiopsPluginStartDeps {
  data: DataPublicPluginStart;
  charts: ChartsPluginStart;
  uiActions: UiActionsStart;
  fieldFormats: FieldFormatsStart;
  lens: LensPublicStart;
  share: SharePluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  storage: IStorageWrapper;
  licensing: LicensingPluginStart;
  executionContext: ExecutionContextStart;
  embeddable: EmbeddableStart;
}

export type AiopsPluginSetup = void;
export interface AiopsPluginStart {
  EmbeddableChangePointChart: React.ComponentType<EmbeddableChangePointChartProps>;
}
