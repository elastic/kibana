/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsType } from '../../../../../../../src/core/server';
import { ruleActionsSavedObjectMigration } from './migrations';

/**
 * We keep this around to migrate and update data for the old deprecated rule actions saved object mapping but we
 * do not use it anymore within the code base. Once we feel comfortable that users are upgrade far enough and this is no longer
 * needed then it will be safe to remove this saved object and all its migrations.
 * * @deprecated Remove this once we no longer need legacy migrations for rule actions (8.0.0)
 */
const ruleActionsSavedObjectType = 'siem-detection-engine-rule-actions';

/**
 * We keep this around to migrate and update data for the old deprecated rule actions saved object mapping but we
 * do not use it anymore within the code base. Once we feel comfortable that users are upgrade far enough and this is no longer
 * needed then it will be safe to remove this saved object and all its migrations.
 * * @deprecated Remove this once we no longer need legacy migrations for rule actions (8.0.0)
 */
const ruleActionsSavedObjectMappings: SavedObjectsType['mappings'] = {
  properties: {
    alertThrottle: {
      type: 'keyword',
    },
    ruleAlertId: {
      type: 'keyword',
    },
    ruleThrottle: {
      type: 'keyword',
    },
    actions: {
      properties: {
        group: {
          type: 'keyword',
        },
        id: {
          type: 'keyword',
        },
        action_type_id: {
          type: 'keyword',
        },
        params: {
          type: 'object',
          enabled: false,
        },
      },
    },
  },
};

/**
 * We keep this around to migrate and update data for the old deprecated rule actions saved object mapping but we
 * do not use it anymore within the code base. Once we feel comfortable that users are upgrade far enough and this is no longer
 * needed then it will be safe to remove this saved object and all its migrations.
 * @deprecated Remove this once we no longer need legacy migrations for rule actions (8.0.0)
 */
export const type: SavedObjectsType = {
  name: ruleActionsSavedObjectType,
  hidden: false,
  namespaceType: 'single',
  mappings: ruleActionsSavedObjectMappings,
  migrations: ruleActionsSavedObjectMigration,
};
