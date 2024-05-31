/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defaultLogViewAttributes } from './defaults';
import { LogView, LogViewAttributes, LogViewOrigin } from './types';

export const createLogViewMock = (
  id: string,
  origin: LogViewOrigin = 'stored',
  attributeOverrides: Partial<LogViewAttributes> = {},
  updatedAt?: number,
  version?: string
): LogView => ({
  id,
  origin,
  attributes: {
    ...defaultLogViewAttributes,
    ...attributeOverrides,
  },
  updatedAt,
  version,
});
