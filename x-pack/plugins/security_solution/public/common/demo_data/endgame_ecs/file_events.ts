/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';

export const demoEndgameFileCreateEvent: Ecs = {
  _id: '98jPcG0BOpWiDweSouzg',
  user: {
    id: ['S-1-5-21-3573271228-3407584681-1597858646-1002'],
    domain: ['Anvi-Acer'],
    name: ['Arun'],
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
    action: ['file_create_event'],
    category: ['file'],
    kind: ['event'],
  },
  timestamp: '1569555712000',
  endgame: {
    process_name: ['chrome.exe'],
    pid: [11620],
    file_path: [
      'C:\\Users\\Arun\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\63d78c21-e593-4484-b7a9-db33cd522ddc.tmp',
    ],
  },
};

export const demoEndgameFileDeleteEvent: Ecs = {
  _id: 'OMjPcG0BOpWiDweSeuW9',
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
    ip: ['10.134.159.150'],
    name: ['HD-v1s-d2118419'],
  },
  event: {
    module: ['endgame'],
    dataset: ['esensor'],
    action: ['file_delete_event'],
    category: ['file'],
    kind: ['event'],
  },
  timestamp: '1569555704000',
  endgame: {
    pid: [1084],
    file_name: ['tmp000002f6'],
    file_path: ['C:\\Windows\\TEMP\\tmp00000404\\tmp000002f6'],
    process_name: ['AmSvc.exe'],
  },
};
