/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { v4 as generateUUID } from 'uuid';
// @ts-ignore
import minimist from 'minimist';
import { KbnClient, ToolingLog } from '@kbn/dev-utils';
import { ENDPOINT_TRUSTED_APPS_LIST_ID } from '../../../../lists/common/constants';
import { TRUSTED_APPS_LIST_API } from '../../../common/endpoint/constants';
import { ExceptionListItemSchema } from '../../../../lists/common/schemas/response';

interface RunOptions {
  count?: number;
}

const logger = new ToolingLog({ level: 'info', writeTo: process.stdout });
const separator = '----------------------------------------';

export const cli = async () => {
  const options: RunOptions = minimist(process.argv.slice(2), {
    default: {
      count: 10,
    },
  });
  logger.write(`${separator}
Loading ${options.count} Trusted App Entries`);
  await run(options);
  logger.write(`Done!
${separator}`);
};

export const run: (options?: RunOptions) => Promise<ExceptionListItemSchema[]> = async ({
  count = 10,
}: RunOptions = {}) => {
  const kbnClient = new KbnClient(logger, { url: 'http://elastic:changeme@localhost:5601' });

  // touch the Trusted Apps List so it can be created
  await kbnClient.request({
    method: 'GET',
    path: TRUSTED_APPS_LIST_API,
  });

  return Promise.all(
    Array.from({ length: count }, () => {
      return kbnClient
        .request({
          method: 'POST',
          path: '/api/exception_lists/items',
          body: generateTrustedAppEntry(),
        })
        .then<ExceptionListItemSchema>((item) => (item as unknown) as ExceptionListItemSchema);
    })
  );
};

interface GenerateTrustedAppEntryOptions {
  os?: 'windows' | 'macos' | 'linux';
  name?: string;
}

const generateTrustedAppEntry: (options?: GenerateTrustedAppEntryOptions) => object = ({
  os = 'windows',
  name = `Sample Endpoint Trusted App Entry ${Date.now()}`,
} = {}) => {
  return {
    list_id: ENDPOINT_TRUSTED_APPS_LIST_ID,
    item_id: `generator_endpoint_trusted_apps_${generateUUID()}`,
    _tags: ['endpoint', `os:${os}`],
    tags: ['user added string for a tag', 'malware'],
    type: 'simple',
    description: 'This is a sample agnostic endpoint trusted app entry',
    name,
    namespace_type: 'agnostic',
    entries: [
      {
        field: 'actingProcess.file.signer',
        operator: 'included',
        type: 'match',
        value: 'Elastic, N.V.',
      },
      {
        field: 'actingProcess.file.path',
        operator: 'included',
        type: 'match',
        value: '/one/two/three',
      },
    ],
  };
};
