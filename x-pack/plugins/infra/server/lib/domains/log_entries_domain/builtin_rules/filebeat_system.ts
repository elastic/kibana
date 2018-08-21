/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const filebeatSystemRules = [
  {
    when: {
      exists: ['system.syslog.message'],
    },
    format: [
      {
        field: 'system.syslog.message',
      },
    ],
  },
  {
    when: {
      exists: ['system.auth.message'],
    },
    format: [
      {
        field: 'system.auth.message',
      },
    ],
  },
  {
    when: {
      exists: ['system.auth.ssh.event'],
    },
    format: [
      {
        constant: 'ssh',
      },
      {
        constant: ' ',
      },
      {
        field: 'system.auth.ssh.event',
      },
      {
        constant: ' user ',
      },
      {
        field: 'system.auth.user',
      },
      {
        constant: ' from ',
      },
      {
        field: 'system.auth.ssh.ip',
      },
    ],
  },
  {
    when: {
      exists: ['system.auth.ssh.dropped_ip'],
    },
    format: [
      {
        constant: 'ssh',
      },
      {
        constant: ' Dropped connection from ',
      },
      {
        field: 'system.auth.ssh.dropped_ip',
      },
    ],
  },
];
