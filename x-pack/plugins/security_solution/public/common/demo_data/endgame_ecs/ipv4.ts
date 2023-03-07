/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';

export const demoEndgameIpv4ConnectionAcceptEvent: Ecs = {
  _id: 'LsjPcG0BOpWiDweSCNfu',
  user: {
    id: ['S-1-5-18'],
    domain: ['NT AUTHORITY'],
    name: ['SYSTEM'],
  },
  host: {
    os: {
      platform: ['windows'],
      name: ['Windows'],
      version: ['10.0'],
    },
    ip: ['10.43.255.177'],
    name: ['HD-gqf-0af7b4fe'],
  },
  event: {
    module: ['endgame'],
    dataset: ['esensor'],
    action: ['ipv4_connection_accept_event'],
    category: ['network'],
    kind: ['event'],
  },
  timestamp: '1569555676000',
  network: {
    community_id: ['1:network-community_id'],
    transport: ['tcp'],
  },
  process: {
    pid: [1084],
    name: ['AmSvc.exe'],
    executable: ['C:\\Program Files\\Cybereason ActiveProbe\\AmSvc.exe'],
  },
  source: {
    ip: ['127.0.0.1'],
    port: [49306],
  },
  destination: {
    port: [49305],
    ip: ['127.0.0.1'],
  },
  endgame: {
    pid: [1084],
  },
};
