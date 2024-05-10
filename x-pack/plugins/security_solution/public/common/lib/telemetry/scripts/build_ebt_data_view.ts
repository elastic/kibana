/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import axios from 'axios';

const logger = new ToolingLog({
  level: 'info',
  writeTo: process.stdout,
});

cli()
  .then(() => logger.success('End ebt data view update'))
  .catch((e) => logger.error(e));

async function cli(): Promise<void> {
  logger.info(`Begin ebt data view update`);
  const args = process.argv.slice(2); // Ignore first two arguments (path to node and script file)

  const namedArgs: { [key: string]: string } = {};

  // Parse named arguments
  args.forEach((arg) => {
    // this strategy ensures that the value can contain an equals sign
    const [key, ...valueParts] = arg.split('=');
    const value = valueParts.join('=');
    namedArgs[key.replace('--', '')] = value;
  });

  // Access named arguments
  const {
    api_key: apiKey,
    kibana_url: kibanaUrl,
    space_id: spaceId,
    data_view_name: dataViewName,
  } = namedArgs;
  logger.info(`API key: ${apiKey}`);
  logger.info(`Kibana URL: ${kibanaUrl}`);
  logger.info(`Space ID: ${spaceId}`);
  logger.info(`Data view name: ${dataViewName}`);
  const requestHeaders = {
    Authorization: `ApiKey ${apiKey}`,
    'kbn-xsrf': 'xxx',
    'Content-Type': 'application/json',
  };
  logger.info(`requestHeaders ID: ${requestHeaders}`);
  const dataViewApiUrl = `${removeTrailingSlash(kibanaUrl)}/s/${spaceId}/api/data_views`;

  try {
    logger.info(`Fetching data view "${dataViewName}"...`);
    const dataViews = await axios.get(dataViewApiUrl, {
      headers: requestHeaders,
    });
    console.log('dataViews', dataViews);

    logger.info(`Data view "" has been fetched`);
  } catch (e) {
    logger.error(`Error fetching data view "${dataViewName}" - ${e}`);
    throw e;
  }

  // const runtimeFieldApiUrl = `${dataViewApiUrl}/data_view/${dataViewName}/runtime_field`;
  //
  // try {
  //   logger.info(`Fetching data view "${data_view_name}"...`);
  //   await axios.put(
  //     `${KIBANA_URL}/api/security/role/${role}`,
  //     {
  //       elasticsearch: selectedRoleDefinition.elasticsearch,
  //       kibana: selectedRoleDefinition.kibana,
  //     },
  //     {
  //       headers: requestHeaders,
  //     }
  //   );
  //
  //   logger.info(`Role "${role}" has been created`);
  // } catch (e) {
  //   logger.error(`Unable to create role "${role}"`);
  //   throw e;
  // }
}

function removeTrailingSlash(url: string) {
  if (url.endsWith('/')) {
    return url.slice(0, -1);
  } else {
    return url;
  }
}
