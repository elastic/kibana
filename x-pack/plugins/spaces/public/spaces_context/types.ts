/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as React from 'react';

import type { CoreStart, StartServicesAccessor } from 'src/core/public';

import type { PluginsStart } from '../plugin';
import type { SpacesManager } from '../spaces_manager';
import type { ShareToSpacesData } from '../types';

export type KibanaServices = Partial<CoreStart>;

export interface SpacesReactContextValue<Services extends KibanaServices> {
  readonly spacesManager: SpacesManager;
  readonly shareToSpacesDataPromise: Promise<ShareToSpacesData>;
  readonly services: Services;
}

export interface SpacesReactContext<T extends KibanaServices> {
  value: SpacesReactContextValue<T>;
  Provider: React.FC;
  Consumer: React.Consumer<SpacesReactContextValue<T>>;
}

export interface InternalProps {
  spacesManager: SpacesManager;
  getStartServices: StartServicesAccessor<PluginsStart>;
}
