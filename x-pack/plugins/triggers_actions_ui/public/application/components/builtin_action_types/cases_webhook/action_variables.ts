/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionVariable } from '@kbn/alerting-plugin/common';

export const casesVars: ActionVariable[] = [
  { name: 'case.title', description: 'test title', useWithTripleBracesInTemplates: true },
  {
    name: 'case.description',
    description: 'test description',
    useWithTripleBracesInTemplates: true,
  },
  { name: 'case.tags', description: 'test tags', useWithTripleBracesInTemplates: true },
];

export const commentVars: ActionVariable[] = [
  { name: 'case.comment', description: 'test comment', useWithTripleBracesInTemplates: true },
];

export const urlVars: ActionVariable[] = [
  { name: 'external.system.id', description: 'test id', useWithTripleBracesInTemplates: true },
];

export const urlVarsExt: ActionVariable[] = [
  ...urlVars,
  {
    name: 'external.system.title',
    description: 'test title',
    useWithTripleBracesInTemplates: true,
  },
];
