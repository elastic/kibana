/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ControlPanels } from '@kbn/observability-shared-plugin/public';

export const availableControlsPanels = {
  HOST_OS_NAME: 'host.os.name',
  CLOUD_PROVIDER: 'cloud.provider',
  SERVICE_NAME: 'service.name',
};

export const controlPanelConfigs: ControlPanels = {
  [availableControlsPanels.HOST_OS_NAME]: {
    order: 0,
    width: 'medium',
    grow: false,
    type: 'optionsListControl',
    fieldName: availableControlsPanels.HOST_OS_NAME,
    title: 'Operating System',
  },
  [availableControlsPanels.CLOUD_PROVIDER]: {
    order: 1,
    width: 'medium',
    grow: false,
    type: 'optionsListControl',
    fieldName: availableControlsPanels.CLOUD_PROVIDER,
    title: 'Cloud Provider',
  },
  [availableControlsPanels.SERVICE_NAME]: {
    order: 2,
    width: 'medium',
    grow: false,
    type: 'optionsListControl',
    fieldName: availableControlsPanels.SERVICE_NAME,
    title: 'Service Name',
  },
};
