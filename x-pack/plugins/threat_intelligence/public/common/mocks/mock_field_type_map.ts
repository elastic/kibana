/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Mock to map an indicator field to its type.
 */
export const generateFieldTypeMap = (): { [id: string]: string } => ({
  '@timestamp': 'date',
  'threat.indicator.ip': 'ip',
  'threat.indicator.first_seen': 'date',
  'threat.feed.name': 'string',
});
