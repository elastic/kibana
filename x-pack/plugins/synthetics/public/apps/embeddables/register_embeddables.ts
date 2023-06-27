/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup } from '@kbn/core-lifecycle-browser';
import { ClientPluginsSetup, ClientPluginsStart } from '../../plugin';
import {
  STATUS_GRID_EMBEDDABLE,
  StatusGridEmbeddableFactoryDefinition,
} from '../synthetics/components/monitors_page/overview/embeddable/status_grid';

export const registerSyntheticsEmbeddables = (
  core: CoreSetup<ClientPluginsStart, unknown>,
  plugins: ClientPluginsSetup
) => {
  plugins.embeddable.registerEmbeddableFactory(
    STATUS_GRID_EMBEDDABLE,
    new StatusGridEmbeddableFactoryDefinition()
  );
};
