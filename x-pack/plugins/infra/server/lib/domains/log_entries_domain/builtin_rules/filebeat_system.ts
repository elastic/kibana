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
        constant: '[syslog][system] ',
      },
      {
        field: 'system.syslog.program',
      },
      {
        constant: ' - ',
      },
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
        constant: '[syslog][auth] ',
      },
      {
        field: 'system.syslog.program',
      },
      {
        constant: ' - ',
      },
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
        constant: '[syslog][auth][ssh]',
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
        constant: '[syslog][auth][ssh]',
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
