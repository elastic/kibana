/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */

import { argv } from 'yargs';
import { isAxiosError } from './call_kibana';
import { createKibanaUserRole, AbortError } from './create_kibana_user_role';

const esUserName = (argv.username as string) || 'elastic';
const esPassword = argv.password as string | undefined;
const kibanaBaseUrl = argv.kibanaUrl as string | undefined;
const kibanaRoleSuffix = argv.roleSuffix as string | undefined;

if (!esPassword) {
  throw new Error(
    'Please specify credentials for elasticsearch: `--username elastic --password abcd` '
  );
}

if (!kibanaBaseUrl) {
  throw new Error(
    'Please specify the url for Kibana: `--kibana-url http://localhost:5601` '
  );
}

if (
  !kibanaBaseUrl.startsWith('https://') &&
  !kibanaBaseUrl.startsWith('http://')
) {
  throw new Error(
    'Kibana url must be prefixed with http(s):// `--kibana-url http://localhost:5601`'
  );
}

if (!kibanaRoleSuffix) {
  throw new Error(
    'Please specify a unique suffix that will be added to your roles with `--role-suffix <suffix>` '
  );
}

console.log({
  kibanaRoleSuffix,
  esUserName,
  esPassword,
  kibanaBaseUrl,
});

createKibanaUserRole({
  kibana: {
    roleSuffix: kibanaRoleSuffix,
    hostname: kibanaBaseUrl,
  },
  elasticsearch: {
    username: esUserName,
    password: esPassword,
  },
}).catch((e) => {
  if (e instanceof AbortError) {
    console.error(e.message);
  } else if (isAxiosError(e)) {
    console.error(
      `${e.config.method?.toUpperCase() || 'GET'} ${e.config.url} (Code: ${
        e.response?.status
      })`
    );

    if (e.response) {
      console.error(
        JSON.stringify(
          { request: e.config, response: e.response.data },
          null,
          2
        )
      );
    }
  } else {
    console.error(e);
  }
});
