/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StartServicesAccessor } from 'src/core/public';
import type { SpacesApiUi } from '../../../../../src/plugins/spaces_oss/public';
import { PluginsStart } from '../plugin';
import { SpacesManager } from '../spaces_manager';
import { getComponents } from './components';

interface GetUiApiOptions {
  spacesManager: SpacesManager;
  getStartServices: StartServicesAccessor<PluginsStart>;
}

export const getUiApi = ({ spacesManager, getStartServices }: GetUiApiOptions): SpacesApiUi => {
  const components = getComponents({ spacesManager, getStartServices });

  return {
    components,
  };
};
