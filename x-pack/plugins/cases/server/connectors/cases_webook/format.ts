/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Format } from './types';

export const format: Format = (theCase, alerts) => {
  return {
    summary: theCase.title,
    description: theCase.description,
    // CasesWebook do not allows empty spaces on labels. We replace white spaces with hyphens
    labels: theCase.tags.map((tag) => tag.replace(/\s+/g, '-')),
  };
};
