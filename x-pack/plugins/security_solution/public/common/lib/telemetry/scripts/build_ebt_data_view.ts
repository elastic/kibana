/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import axios from 'axios';
import { telemetryEvents } from '../events/telemetry_events';

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
    const {
      data: { data_view: dataViews },
    } = await axios.get(dataViewApiUrl, {
      headers: requestHeaders,
    });
    const ourDataView = dataViews.find(
      (dataView: { id: string; name: string }) => dataView.name === dataViewName
    );
    if (!ourDataView) {
      throw new Error(
        `Data view "${dataViewName}" not found, check your data view is spelled correctly and is defined in the ${spaceId} space`
      );
    }

    logger.info(`Data view "${dataViewName}" has been fetched`);
    const runtimeFields: Record<string, string> = {};
    const manualRuntimeFields: Record<string, string> = {};
    const valueMap: Record<string, string> = {
      // actual allowed values
      boolean: 'boolean',
      composite: 'composite',
      date: 'date',
      double: 'double',
      geo_point: 'geo_point',
      ip: 'ip',
      keyword: 'keyword',
      long: 'long',
      lookup: 'lookup',
      // custom mapped
      text: 'keyword',
      integer: 'long',
    };
    const allowedValues = Object.keys(valueMap);
    telemetryEvents.forEach((event) => {
      const newProps = flattenSchema(event.schema);
      Object.entries(newProps).forEach(([key, value]) => {
        if (!runtimeFields[key] && allowedValues.includes(value)) {
          runtimeFields[key] = valueMap[value];
        } else if (!allowedValues.includes(value) && !manualRuntimeFields[key]) {
          manualRuntimeFields[key] = value;
        }
      });
    });
    console.log('runtimeFields', JSON.stringify(runtimeFields, null, 2));
    console.log('manualRuntimeFields', JSON.stringify(manualRuntimeFields, null, 2));
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
interface NestedObject {
  [key: string]: { type?: string; properties?: NestedObject };
}

function flattenSchema(inputObj: NestedObject): { [key: string]: string } {
  const result: { [key: string]: string } = {};
  const queue: Array<{ obj: NestedObject; prefix: string }> = [{ obj: inputObj, prefix: '' }];
  while (queue.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const { obj, prefix } = queue.shift()!;
    for (const key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        if ('type' in obj[key]) {
          const newKey = `${prefix}${key}`;
          // @ts-ignore
          result[newKey] = obj[key].type;
        } else if (obj[key].properties) {
          const nestedObj = obj[key].properties;
          const nestedPrefix = `${prefix}${key}.`;
          // @ts-ignore
          queue.push({ obj: nestedObj, prefix: nestedPrefix });
        } else if (obj[key]) {
          const nestedObj = obj[key];
          const nestedPrefix = `${prefix}${key}.`;
          // @ts-ignore
          queue.push({ obj: nestedObj, prefix: nestedPrefix });
        }
      }
    }
  }
  return result;
}
