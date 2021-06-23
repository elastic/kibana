/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HostsEdges } from '../../../../common/search_strategy/security_solution/hosts';

export const mockData: HostsEdges[] = [
  {
    node: {
      _id: 'beats-ci-immutable-ubuntu-1804-1615475026535098510',
      lastSeen: ['2021-03-11T15:05:36.783Z'],
      host: {
        name: ['beats-ci-immutable-ubuntu-1804-1615475026535098510'],
        os: { name: ['Ubuntu'], version: ['18.04.5 LTS (Bionic Beaver)'] },
      },
    },
    cursor: { value: 'beats-ci-immutable-ubuntu-1804-1615475026535098510', tiebreaker: null },
  },
];
