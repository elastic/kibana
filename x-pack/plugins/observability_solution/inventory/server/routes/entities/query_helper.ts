/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityType } from '../../../common/entities';
import { ENTITY_DEFINITION_ID, ENTITY_TYPE } from '../../../common/es_fields/entities';

const defaultEntityTypes: EntityType[] = ['service', 'host', 'container'];

export const getEntityTypesWhereClause = (entityTypes: EntityType[] = defaultEntityTypes) =>
  `WHERE ${ENTITY_TYPE} IN (${entityTypes.map((entityType) => `"${entityType}"`).join()})`;

const BUILTIN_SERVICES_FROM_ECS_DATA = 'builtin_services_from_ecs_data';
const BUILTIN_HOSTS_FROM_ECS_DATA = 'builtin_hosts_from_ecs_data';
const BUILTIN_CONTAINERS_FROM_ECS_DATA = 'builtin_containers_from_ecs_data';

export const getEntityDefinitionIdWhereClause = () =>
  `WHERE ${ENTITY_DEFINITION_ID} IN (${[
    BUILTIN_SERVICES_FROM_ECS_DATA,
    BUILTIN_HOSTS_FROM_ECS_DATA,
    BUILTIN_CONTAINERS_FROM_ECS_DATA,
  ]
    .map((buildin) => `"${buildin}"`)
    .join()})`;
