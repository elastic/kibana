/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import axios from 'axios';
import { events as genAiEvents } from '@kbn/elastic-assistant-plugin/server/lib/telemetry/event_based_telemetry';

import { events as securityEvents } from '../../server/lib/telemetry/event_based/events';
import { telemetryEvents } from '../../public/common/lib/telemetry/events/telemetry_events';
// uncomment and add to run script, but do not commit as creates cirular dependency
// import { telemetryEvents as serverlessEvents } from '@kbn/security-solution-serverless/server/telemetry/event_based_telemetry';

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
    telemetry_type: telemetryType,
  } = namedArgs;
  // writes to either the browser or server side security solution data view
  const dataViewName = `security-solution-ebt-kibana-${telemetryType}`;
  logger.info(`API key: ${apiKey}`);
  logger.info(`Kibana URL: ${kibanaUrl}`);
  logger.info(`Space ID: ${spaceId}`);
  logger.info(`Data view name: ${dataViewName}`);
  const requestHeaders = {
    Authorization: `ApiKey ${apiKey}`,
    'kbn-xsrf': 'xxx',
    'Content-Type': 'application/json',
  };
  const dataViewApiUrl = `${removeTrailingSlash(
    kibanaUrl
  )}/s/${spaceId}/api/data_views/data_view/${dataViewName}`;

  try {
    logger.info(`Fetching data view "${dataViewName}"...`);
    const {
      data: { data_view: ourDataView },
    } = await axios.get(dataViewApiUrl, {
      headers: requestHeaders,
    });

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

    const events =
      telemetryType === 'browser'
        ? telemetryEvents
        : // serverside events, uncomment serverlessEvents import above for all events
          [...genAiEvents, ...securityEvents]; // ...serverlessEvents,]

    events.forEach((event) => {
      const newProps = flattenSchema(event.schema);
      Object.entries(newProps).forEach(([key, value]) => {
        if (!runtimeFields[key] && allowedValues.includes(value)) {
          runtimeFields[key] = valueMap[value];
        } else if (!allowedValues.includes(value) && !manualRuntimeFields[key]) {
          manualRuntimeFields[key] = value;
        }
      });
    });

    const runtimeFieldUrl = `${dataViewApiUrl}/runtime_field`;
    await upsertRuntimeFields(runtimeFields, runtimeFieldUrl, requestHeaders);
    const manualFieldLength = Object.keys(manualRuntimeFields).length;
    const runtimeFieldLength = Object.keys(runtimeFields).length;
    if (runtimeFieldLength > 0) {
      logger.info(
        `Data view "${dataViewName}" has been updated with ${
          Object.keys(runtimeFields).length
        } runtime fields`
      );
    }

    if (manualFieldLength > 0) {
      logger.info(
        `The following ${
          Object.keys(manualRuntimeFields).length
        } fields have non-standard types and will need to be manually updated: ${JSON.stringify(
          manualRuntimeFields,
          null,
          2
        )}`
      );
    }
  } catch (e) {
    logger.error(`Error updating data view "${dataViewName}" - ${e}`);
    throw e;
  }
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

async function upsertRuntimeFields(
  fields: { [key: string]: string },
  requestUrl: string,
  requestHeaders: { [key: string]: string }
) {
  for (const fieldName in fields) {
    if (typeof fields[fieldName] === 'string') {
      const fieldType = fields[fieldName];
      const payload = {
        name: `properties.${fieldName}`,
        runtimeField: {
          type: fieldType,
        },
      };

      try {
        await axios.put(requestUrl, payload, {
          headers: requestHeaders,
        });
      } catch (error) {
        throw new Error(`Error upserting field '${fieldName}: ${fieldType}' - ${error.message}`);
      }
    }
  }
}
