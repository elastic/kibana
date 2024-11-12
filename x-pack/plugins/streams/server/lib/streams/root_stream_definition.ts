/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StreamDefinition } from '../../../common/types';

export const rootStreamDefinition: StreamDefinition = {
  id: 'logs',
  processing: [],
  children: [],
  fields: [
    {
      name: '@timestamp',
      type: 'date',
    },
    {
      name: 'message',
      type: 'match_only_text',
    },
    {
      name: 'host.name',
      type: 'keyword',
    },
    {
      name: 'log.level',
      type: 'keyword',
    },
  ],
};
