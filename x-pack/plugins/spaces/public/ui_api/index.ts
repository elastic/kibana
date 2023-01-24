/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StartServicesAccessor } from '@kbn/core/public';

import { createRedirectLegacyUrl } from '../legacy_urls';
import type { PluginsStart } from '../plugin';
import { useSpaces } from '../spaces_context';
import type { SpacesManager } from '../spaces_manager';
import { getComponents } from './components';
import type { LazyComponentFn, SpacesApiUi, SpacesApiUiComponent } from './types';

interface GetUiApiOptions {
  spacesManager: SpacesManager;
  getStartServices: StartServicesAccessor<PluginsStart>;
}

export type { LazyComponentFn, SpacesApiUi, SpacesApiUiComponent };

export const getUiApi = ({ spacesManager, getStartServices }: GetUiApiOptions): SpacesApiUi => {
  const components = getComponents({ spacesManager, getStartServices });

  return {
    components,
    redirectLegacyUrl: createRedirectLegacyUrl(getStartServices),
    useSpaces,
  };
};
