/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const WORKCHAT_FEATURE_ID = 'workchat';
export const WORKCHAT_FEATURE_NAME = 'WorkChat';
export const WORKCHAT_APP_ID = 'workchat';

export const uiCapabilities = {
  show: 'show',
  showManagement: 'showManagement',
};

export const apiCapabilities = {
  useWorkchat: 'workchat_use',
  manageWorkchat: 'workchat_manage',
};

// defining feature groups here because it's less error prone when adding new capabilities
export const capabilityGroups = {
  ui: {
    read: [uiCapabilities.show],
    all: [uiCapabilities.show, uiCapabilities.showManagement],
  },
  api: {
    read: [apiCapabilities.useWorkchat],
    all: [apiCapabilities.useWorkchat, apiCapabilities.manageWorkchat],
  },
};
