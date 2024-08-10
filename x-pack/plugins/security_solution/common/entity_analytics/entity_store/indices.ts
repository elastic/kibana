/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const indexBase = '.entity-store.relations';
export const getEntityRelationsIndex = (namespace: string) => `${indexBase}-${namespace}`;

const storeIndex = '.entities.v1.latest.secsol-ea-entity-store';
export const getEntityStoreIndex = (namespace: string) => `${storeIndex}`;
