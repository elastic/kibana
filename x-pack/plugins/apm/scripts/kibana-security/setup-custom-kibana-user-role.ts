/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */

import { argv } from 'yargs';
import {
  createKibanaUserRole,
  isAxiosError,
  AbortError,
} from './create_kibana_user_role';

const kibanaRoleSuffix = argv.roleSuffix as string | undefined;
const esUserName = (argv.username as string) || 'elastic';
const esPassword = argv.password as string | undefined;
const kibanaBaseUrl = argv.kibanaUrl as string | undefined;

console.log({
  kibanaRoleSuffix,
  esUserName,
  esPassword,
  kibanaBaseUrl,
});

createKibanaUserRole({
  kibanaRoleSuffix,
  esUserName,
  esPassword,
  kibanaBaseUrl,
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
