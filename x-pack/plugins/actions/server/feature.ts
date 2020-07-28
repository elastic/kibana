/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { ACTION_SAVED_OBJECT_TYPE, ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE } from './saved_objects';

export const ACTIONS_FEATURE = {
  id: 'actions',
  name: i18n.translate('xpack.actions.featureRegistry.actionsFeatureName', {
    defaultMessage: 'Actions',
  }),
  icon: 'bell',
  navLinkId: 'actions',
  app: [],
  privileges: {
    all: {
      app: [],
      api: [],
      catalogue: [],
      savedObject: {
        all: [ACTION_SAVED_OBJECT_TYPE, ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE],
        read: [],
      },
      ui: ['show', 'execute', 'save', 'delete'],
    },
    read: {
      app: [],
      api: [],
      catalogue: [],
      savedObject: {
        // action execution requires 'read' over `actions`, but 'all' over `action_task_params`
        all: [ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE],
        read: [ACTION_SAVED_OBJECT_TYPE],
      },
      ui: ['show', 'execute'],
    },
  },
};
