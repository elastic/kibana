/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */

import { argv } from 'yargs';
import { AbortError, isAxiosError } from './helpers/call_kibana';
import { createApmAndObsUsersAndRoles } from './create_apm_users_and_roles';
import { getKibanaVersion } from './helpers/get_version';

async function init() {
  const esUserName = (argv.username as string) || 'elastic';
  const esPassword = argv.password as string | undefined;
  const kibanaBaseUrl = argv.kibanaUrl as string | undefined;
  const kibanaRoleSuffix = argv.roleSuffix as string | undefined;

  if (!esPassword) {
    console.error(
      'Please specify credentials for elasticsearch: `--username elastic --password abcd` '
    );
    process.exit();
  }

  if (!kibanaBaseUrl) {
    console.error(
      'Please specify the url for Kibana: `--kibana-url http://localhost:5601` '
    );
    process.exit();
  }

  if (
    !kibanaBaseUrl.startsWith('https://') &&
    !kibanaBaseUrl.startsWith('http://')
  ) {
    console.error(
      'Kibana url must be prefixed with http(s):// `--kibana-url http://localhost:5601`'
    );
    process.exit();
  }

  if (!kibanaRoleSuffix) {
    console.error(
      'Please specify a unique suffix that will be added to your roles with `--role-suffix <suffix>` '
    );
    process.exit();
  }

  const kibana = { roleSuffix: kibanaRoleSuffix, hostname: kibanaBaseUrl };
  const elasticsearch = { username: esUserName, password: esPassword };

  console.log({ kibana, elasticsearch });

  const version = await getKibanaVersion({ elasticsearch, kibana });
  console.log(`Connected to Kibana ${version}`);

  const users = await createApmAndObsUsersAndRoles({ elasticsearch, kibana });
  const credentials = users
    .map((u) => ` - ${u.username} / ${esPassword}`)
    .join('\n');

  console.log(
    `\nYou can now login to ${kibana.hostname} with:\n${credentials}`
  );
}

init().catch((e) => {
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
