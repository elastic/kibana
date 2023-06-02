/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';

export const demoEndgameCreationEvent: Ecs = {
  _id: 'BcjPcG0BOpWiDweSou3g',
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
    action: ['creation_event'],
    category: ['process'],
    type: ['process_start'],
    kind: ['event'],
  },
  timestamp: '1569555712000',
  process: {
    hash: {
      md5: ['62d06d7235b37895b68de56687895743'],
      sha1: ['12563599116157778a22600d2a163d8112aed845'],
      sha256: ['d4c97ed46046893141652e2ec0056a698f6445109949d7fcabbce331146889ee'],
    },
    pid: [441684],
    ppid: [8],
    name: ['Microsoft.Photos.exe'],
    executable: [
      'C:\\Program Files\\WindowsApps\\Microsoft.Windows.Photos_2018.18091.17210.0_x64__8wekyb3d8bbwe\\Microsoft.Photos.exe',
    ],
    args: [
      'C:\\Program Files\\WindowsApps\\Microsoft.Windows.Photos_2018.18091.17210.0_x64__8wekyb3d8bbwe\\Microsoft.Photos.exe',
      '-ServerName:App.AppXzst44mncqdg84v7sv6p7yznqwssy6f7f.mca',
    ],
  },
  endgame: {
    process_name: ['Microsoft.Photos.exe'],
    pid: [441684],
    parent_process_name: ['svchost.exe'],
  },
};
