/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getCustomLatestTemplateComponents = (definitionId: string) => [
  `${definitionId}@platform`, // @platform goes before so it can be overwritten by custom
  `${definitionId}-latest@platform`,
  `${definitionId}@custom`,
  `${definitionId}-latest@custom`,
];

export const getCustomHistoryTemplateComponents = (definitionId: string) => [
  `${definitionId}@platform`, // @platform goes before so it can be overwritten by custom
  `${definitionId}-history@platform`,
  `${definitionId}@custom`,
  `${definitionId}-history@custom`,
];
