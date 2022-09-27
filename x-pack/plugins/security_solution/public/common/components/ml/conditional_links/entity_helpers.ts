/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const emptyEntity = (entity?: string): boolean =>
  !!entity && (entity.trim() === '' || (entity.startsWith('$') && entity.endsWith('$')));

export const multipleEntities = (entity?: string): boolean =>
  !!entity && entity.split(',').length > 1;

export const getMultipleEntities = (entity?: string): string[] => (entity ? entity.split(',') : []);
