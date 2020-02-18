/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { filebeatApache2Rules } from './filebeat_apache2';
import { filebeatAuditdRules } from './filebeat_auditd';
import { filebeatHaproxyRules } from './filebeat_haproxy';
import { filebeatIcingaRules } from './filebeat_icinga';
import { filebeatIisRules } from './filebeat_iis';
import { filebeatLogstashRules } from './filebeat_logstash';
import { filebeatMongodbRules } from './filebeat_mongodb';
import { filebeatMySQLRules } from './filebeat_mysql';
import { filebeatNginxRules } from './filebeat_nginx';
import { filebeatOsqueryRules } from './filebeat_osquery';
import { filebeatRedisRules } from './filebeat_redis';
import { filebeatSystemRules } from './filebeat_system';
import { filebeatTraefikRules } from './filebeat_traefik';

import { getGenericRules } from './generic';
import { genericWebserverRules } from './generic_webserver';

export const getBuiltinRules = (genericMessageFields: string[]) => [
  ...filebeatApache2Rules,
  ...filebeatNginxRules,
  ...filebeatRedisRules,
  ...filebeatSystemRules,
  ...filebeatMySQLRules,
  ...filebeatAuditdRules,
  ...filebeatHaproxyRules,
  ...filebeatIcingaRules,
  ...filebeatIisRules,
  ...filebeatLogstashRules,
  ...filebeatMongodbRules,
  ...filebeatOsqueryRules,
  ...filebeatTraefikRules,
  ...genericWebserverRules,
  ...getGenericRules(genericMessageFields),
  {
    when: {
      exists: ['log.path'],
    },
    format: [
      {
        constant: 'failed to format message from ',
      },
      {
        field: 'log.path',
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
