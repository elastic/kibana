/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { run, RunFn, createFailError } from '@kbn/dev-utils';
import { KbnClient } from '@kbn/test';
import { AxiosError } from 'axios';
import pMap from 'p-map';
import type { CreateExceptionListSchema } from '@kbn/securitysolution-io-ts-list-types';
import {
  ENDPOINT_BLOCKLISTS_LIST_DESCRIPTION,
  ENDPOINT_BLOCKLISTS_LIST_ID,
  ENDPOINT_BLOCKLISTS_LIST_NAME,
  EXCEPTION_LIST_ITEM_URL,
  EXCEPTION_LIST_URL,
} from '@kbn/securitysolution-list-constants';
import { randomPolicyIdGenerator } from '../common/random_policy_id_generator';
import { ExceptionsListItemGenerator } from '../../../common/endpoint/data_generators/exceptions_list_item_generator';
import { isArtifactByPolicy } from '../../../common/endpoint/service/artifacts';

export const cli = () => {
  run(
    async (options) => {
      try {
        await createBlocklists(options);
        options.log.success(`${options.flags.count} endpoint blocklists created`);
      } catch (e) {
        options.log.error(e);
        throw createFailError(e.message);
      }
    },
    {
      description: 'Load Endpoint Blocklists',
      flags: {
        string: ['kibana'],
        default: {
          count: 10,
          kibana: 'http://elastic:changeme@localhost:5601',
        },
        help: `
        --count            Number of blocklists to create. Default: 10
        --kibana           The URL to kibana including credentials. Default: http://elastic:changeme@localhost:5601
      `,
      },
    }
  );
};

class BlocklistDataLoaderError extends Error {
  constructor(message: string, public readonly meta: unknown) {
    super(message);
  }
}

const handleThrowAxiosHttpError = (err: AxiosError): never => {
  let message = err.message;

  if (err.response) {
    message = `[${err.response.status}] ${err.response.data.message ?? err.message} [ ${String(
      err.response.config.method
    ).toUpperCase()} ${err.response.config.url} ]`;
  }
  throw new BlocklistDataLoaderError(message, err.toJSON());
};

const createBlocklists: RunFn = async ({ flags, log }) => {
  const eventGenerator = new ExceptionsListItemGenerator();
  const kbn = new KbnClient({ log, url: flags.kibana as string });

  await ensureCreateEndpointBlocklistsList(kbn);

  const randomPolicyId = await randomPolicyIdGenerator(kbn, log);

  await pMap(
    Array.from({ length: flags.count as unknown as number }),
    () => {
      const body = eventGenerator.generateBlocklistForCreate();

      if (isArtifactByPolicy(body)) {
        const nmExceptions = eventGenerator.randomN(3) || 1;
        body.tags = Array.from({ length: nmExceptions }, () => {
          return `policy:${randomPolicyId()}`;
        });
      }
      return kbn
        .request({
          method: 'POST',
          path: EXCEPTION_LIST_ITEM_URL,
          body,
        })
        .catch((e) => handleThrowAxiosHttpError(e));
    },
    { concurrency: 10 }
  );
};

const ensureCreateEndpointBlocklistsList = async (kbn: KbnClient) => {
  const newListDefinition: CreateExceptionListSchema = {
    description: ENDPOINT_BLOCKLISTS_LIST_DESCRIPTION,
    list_id: ENDPOINT_BLOCKLISTS_LIST_ID,
    meta: undefined,
    name: ENDPOINT_BLOCKLISTS_LIST_NAME,
    os_types: [],
    tags: [],
    type: 'endpoint',
    namespace_type: 'agnostic',
  };

  await kbn
    .request({
      method: 'POST',
      path: EXCEPTION_LIST_URL,
      body: newListDefinition,
    })
    .catch((e) => {
      // Ignore if list was already created
      if (e.response.status !== 409) {
        handleThrowAxiosHttpError(e);
      }
    });
};
