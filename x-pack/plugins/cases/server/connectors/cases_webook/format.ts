/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Format } from './types';

export const format: Format = (theCase) => ({
  title: theCase.title,
  description: theCase.description,
  tags: theCase.tags,
  id: theCase.id,
  severity: theCase.severity,
  status: theCase.status,
});
