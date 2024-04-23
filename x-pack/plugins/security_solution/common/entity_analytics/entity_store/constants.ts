/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const entityStoreBaseIndexName = '.entities';

export const getEntityStoreIndex = (spaceId = 'default') =>
  `${entityStoreBaseIndexName}.entities-${spaceId}`;

export const getEntityStoreHistoryIndex = (spaceId = 'default') =>
  `${entityStoreBaseIndexName}.entity-history-${spaceId}`;
