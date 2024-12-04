/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { SO_ENTITY_DEFINITION_TYPE } from '@kbn/entityManager-plugin/server/saved_objects';
import { RISK_SCORE_INDEX_PATTERN } from '../../../../../common/constants';
import {
  ENTITY_STORE_INDEX_PATTERN,
  ENTITY_STORE_REQUIRED_ES_CLUSTER_PRIVILEGES,
} from '../../../../../common/entity_analytics/entity_store/constants';
import { checkAndFormatPrivileges } from '../../utils/check_and_format_privileges';
import { entityEngineDescriptorTypeName } from '../saved_object';

export const getEntityStorePrivileges = (
  request: KibanaRequest,
  security: SecurityPluginStart,
  securitySolutionIndices: string[]
) => {
  // The entity store needs access to all security solution indices
  const indicesPrivileges = securitySolutionIndices.reduce<Record<string, string[]>>(
    (acc, index) => {
      acc[index] = ['read', 'view_index_metadata'];
      return acc;
    },
    {}
  );

  // The entity store has to create the following indices
  indicesPrivileges[ENTITY_STORE_INDEX_PATTERN] = ['read', 'manage'];
  indicesPrivileges[RISK_SCORE_INDEX_PATTERN] = ['read', 'manage'];

  return checkAndFormatPrivileges({
    request,
    security,
    privilegesToCheck: {
      kibana: [
        security.authz.actions.savedObject.get(entityEngineDescriptorTypeName, 'create'),
        security.authz.actions.savedObject.get(SO_ENTITY_DEFINITION_TYPE, 'create'),
      ],
      elasticsearch: {
        cluster: ENTITY_STORE_REQUIRED_ES_CLUSTER_PRIVILEGES,
        index: indicesPrivileges,
      },
    },
  });
};
