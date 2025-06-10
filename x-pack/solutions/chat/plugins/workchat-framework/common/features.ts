/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const WORKCHAT_FRAMEWORK_FEATURE_ID = 'workchat_framework';
export const WORKCHAT_FRAMEWORK_FEATURE_NAME = 'workchat_framework';
export const WORKCHAT_FRAMEWORK_APP_ID = 'workchat_framework';

export const uiCapabilities = {
  show: 'show',
  showManagement: 'showManagement',
};

export const apiCapabilities = {
  useWorkchatFramework: 'workchat_framework_use',
  manageWorkchatFramework: 'workchat_framework_manage',
};

// defining feature groups here because it's less error prone when adding new capabilities
export const capabilityGroups = {
  ui: {
    read: [uiCapabilities.show],
    all: [uiCapabilities.show, uiCapabilities.showManagement],
  },
  api: {
    read: [apiCapabilities.useWorkchatFramework],
    all: [apiCapabilities.useWorkchatFramework, apiCapabilities.manageWorkchatFramework],
  },
};
