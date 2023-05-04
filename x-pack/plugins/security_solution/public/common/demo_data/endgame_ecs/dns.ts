/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';

export const demoEndgameDnsRequest: Ecs = {
  _id: 'S8jPcG0BOpWiDweSou3g',
  user: {
    id: ['S-1-5-18'],
    domain: ['NT AUTHORITY'],
    name: ['SYSTEM'],
  },
  host: {
    os: {
      platform: ['windows'],
      name: ['Windows'],
      version: ['6.1'],
    },
    ip: ['10.178.85.222'],
    name: ['HD-obe-8bf77f54'],
  },
  event: {
    module: ['endgame'],
    dataset: ['esensor'],
    action: ['request_event'],
    category: ['network'],
    kind: ['event'],
  },
  message: [
    'DNS query is completed for the name %1, type %2, query options %3 with status %4 Results %5 ',
  ],
  timestamp: '1569555712000',
  dns: {
    question: {
      name: ['update.googleapis.com'],
      type: ['A'],
    },
    resolved_ip: ['10.100.197.67'],
  },
  network: {
    protocol: ['dns'],
  },
  process: {
    pid: [443192],
    name: ['GoogleUpdate.exe'],
    executable: ['C:\\Program Files (x86)\\Google\\Update\\GoogleUpdate.exe'],
  },
  winlog: {
    event_id: [3008],
  },
  endgame: {
    process_name: ['GoogleUpdate.exe'],
    pid: [443192],
  },
};
