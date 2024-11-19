/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const iconLookup: Record<string, string> = {
  'host.name': 'desktop',
  'user.name': 'user',
  'process.name': 'gear',
  'file.name': 'document',
  'network.name': 'globe',
  'source.ip': 'globe',
  'destination.ip': 'globe',
  'user.id': 'user',
  'process.pid': 'gear',
  'file.path': 'document',
  'network.ip': 'globe',
  'source.port': 'globe',
  'destination.port': 'globe',
};

export const getIconFromFieldName = (fieldName: string): string => {
  return iconLookup[fieldName] || '';
};
