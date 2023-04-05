/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext } from 'react';

import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';

import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type {
  CoreStart,
  CoreSetup,
  HttpStart,
  IUiSettingsClient,
  ThemeServiceStart,
} from '@kbn/core/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';

export interface AiopsAppDependencies {
  application: CoreStart['application'];
  data: DataPublicPluginStart;
  charts: ChartsPluginStart;
  fieldFormats: FieldFormatsStart;
  http: HttpStart;
  notifications: CoreSetup['notifications'];
  storage: IStorageWrapper;
  theme: ThemeServiceStart;
  uiSettings: IUiSettingsClient;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  share: SharePluginStart;
  lens: LensPublicStart;
}

export const AiopsAppContext = createContext<AiopsAppDependencies | undefined>(undefined);

export const useAiopsAppContext = (): AiopsAppDependencies => {
  const aiopsAppContext = useContext(AiopsAppContext);

  // if `undefined`, throw an error
  if (aiopsAppContext === undefined) {
    throw new Error('useAiopsAppContext was used outside of its Provider');
  }

  return aiopsAppContext;
};
