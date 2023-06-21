/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup } from '@kbn/core-lifecycle-browser';
import {
  STATUS_OVERVIEW_EMBEDDABLE,
  StatusOverviewEmbeddableFactoryDefinition,
} from '../synthetics/components/monitors_page/overview/embeddable/status_overview';
import { ClientPluginsSetup, ClientPluginsStart } from '../../plugin';
import {
  MONITOR_LIST_EMBEDDABLE,
  MonitorListEmbeddableFactoryDefinition,
} from '../synthetics/components/monitors_page/management/embeddable';
import {
  STATUS_GRID_EMBEDDABLE,
  StatusGridEmbeddableFactoryDefinition,
} from '../synthetics/components/monitors_page/overview/embeddable/status_grid';

export const registerSyntheticsEmbeddables = (
  core: CoreSetup<ClientPluginsStart, unknown>,
  plugins: ClientPluginsSetup
) => {
  plugins.embeddable.registerEmbeddableFactory(
    MONITOR_LIST_EMBEDDABLE,
    new MonitorListEmbeddableFactoryDefinition()
  );

  plugins.embeddable.registerEmbeddableFactory(
    STATUS_OVERVIEW_EMBEDDABLE,
    new StatusOverviewEmbeddableFactoryDefinition()
  );

  plugins.embeddable.registerEmbeddableFactory(
    STATUS_GRID_EMBEDDABLE,
    new StatusGridEmbeddableFactoryDefinition()
  );
};
