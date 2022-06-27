/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as React from 'react';

import type { CoreStart, StartServicesAccessor } from '@kbn/core/public';

import type { PluginsStart } from '../plugin';
import type { SpacesManager } from '../spaces_manager';
import type { SpacesData } from '../types';

export interface SpacesReactContextValue<Services extends Partial<CoreStart>> {
  readonly spacesManager: SpacesManager;
  readonly spacesDataPromise: Promise<SpacesData>;
  readonly services: Services;
}

export interface SpacesReactContext<Services extends Partial<CoreStart>> {
  value: SpacesReactContextValue<Services>;
  Provider: React.FC;
  Consumer: React.Consumer<SpacesReactContextValue<Services>>;
}

export interface InternalProps {
  spacesManager: SpacesManager;
  getStartServices: StartServicesAccessor<PluginsStart>;
}

/**
 * Properties for the SpacesContext.
 */
export interface SpacesContextProps {
  /**
   * If a feature is specified, all Spaces components will treat it appropriately if the feature is disabled in a given Space.
   */
  feature?: string;
}
