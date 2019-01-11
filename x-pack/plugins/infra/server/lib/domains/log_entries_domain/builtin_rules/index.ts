/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { filebeatApache2Rules } from './filebeat_apache2';
import { filebeatAuditdRules } from './filebeat_auditd';
import { filebeatMySQLRules } from './filebeat_mysql';
import { filebeatNginxRules } from './filebeat_nginx';
import { filebeatRedisRules } from './filebeat_redis';
import { filebeatSystemRules } from './filebeat_system';

import { genericRules } from './generic';

export const builtinRules = [
  ...filebeatApache2Rules,
  ...filebeatNginxRules,
  ...filebeatRedisRules,
  ...filebeatSystemRules,
  ...filebeatMySQLRules,
  ...filebeatAuditdRules,
  ...genericRules,
  {
    when: {
      exists: ['source'],
    },
    format: [
      {
        constant: 'failed to format message from ',
      },
      {
        field: 'source',
      },
    ],
  },
  {
    when: {
      exists: [],
    },
    format: [
      {
        constant: 'failed to find message',
      },
    ],
  },
];
