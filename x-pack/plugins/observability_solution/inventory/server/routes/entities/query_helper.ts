/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENTITY_DEFINITION_ID, ENTITY_TYPE } from '@kbn/observability-shared-plugin/common';
import { EntityType, defaultEntityTypes, defaultEntityDefinitions } from '../../../common/entities';

export const getEntityTypesWhereClause = (entityTypes: EntityType[] = defaultEntityTypes) =>
  `WHERE ${ENTITY_TYPE} IN (${entityTypes.map((entityType) => `"${entityType}"`).join()})`;

export const getEntityDefinitionIdWhereClause = () =>
  `WHERE ${ENTITY_DEFINITION_ID} IN (${[...defaultEntityDefinitions]
    .map((buildin) => `"${buildin}"`)
    .join()})`;
