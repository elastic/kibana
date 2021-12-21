/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createFailError, run, RunFn } from '@kbn/dev-utils';
import type { CreateExceptionListSchema } from '@kbn/securitysolution-io-ts-list-types';
import {
  ENDPOINT_HOST_ISOLATION_EXCEPTIONS_LIST_DESCRIPTION,
  ENDPOINT_HOST_ISOLATION_EXCEPTIONS_LIST_ID,
  ENDPOINT_HOST_ISOLATION_EXCEPTIONS_LIST_NAME,
  EXCEPTION_LIST_ITEM_URL,
  EXCEPTION_LIST_URL,
} from '@kbn/securitysolution-list-constants';
import { KbnClient } from '@kbn/test';
import { AxiosError } from 'axios';
import { HostIsolationExceptionGenerator } from '../../../common/endpoint/data_generators/host_isolation_exception_generator';
import { randomPolicyIdGenerator } from '../common/random_policy_id_generator';

export const cli = () => {
  run(
    async (options) => {
      try {
        await createHostIsolationException(options);
        options.log.success(`${options.flags.count} endpoint host isolation exceptions`);
      } catch (e) {
        options.log.error(e);
        throw createFailError(e.message);
      }
    },
    {
      description: 'Load Host isolation exceptions',
      flags: {
        string: ['kibana'],
        default: {
          count: 10,
          kibana: 'http://elastic:changeme@localhost:5601',
        },
        help: `
        --count            Number of host isolation exceptions to create. Default: 10
        --kibana           The URL to kibana including credentials. Default: http://elastic:changeme@localhost:5601
      `,
      },
    }
  );
};

class HostIsolationExceptionDataLoaderError extends Error {
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
  throw new HostIsolationExceptionDataLoaderError(message, err.toJSON());
};

const createHostIsolationException: RunFn = async ({ flags, log }) => {
  const exceptionGenerator = new HostIsolationExceptionGenerator();
  const kbn = new KbnClient({ log, url: flags.kibana as string });

  log.info('Creating Host isolation exceptions list');
  await ensureCreateEndpointHostIsolationExceptionList(kbn);

  const randomPolicyId = await randomPolicyIdGenerator(kbn, log);

  log.info('Generating exceptions....');
  await Promise.all(
    Array.from({ length: flags.count as unknown as number }, async () => {
      const body = exceptionGenerator.generate();
      if (body.tags?.length && body.tags[0] !== 'policy:all') {
        const nmExceptions = Math.floor(Math.random() * 3) || 1;
        body.tags = Array.from({ length: nmExceptions }, () => {
          return `policy:${randomPolicyId()}`;
        });
      }
      try {
        return kbn.request({
          method: 'POST',
          path: EXCEPTION_LIST_ITEM_URL,
          body,
        });
      } catch (e) {
        return handleThrowAxiosHttpError(e);
      }
    })
  );
  log.info('Finished.');
};

const ensureCreateEndpointHostIsolationExceptionList = async (kbn: KbnClient) => {
  const newListDefinition: CreateExceptionListSchema = {
    description: ENDPOINT_HOST_ISOLATION_EXCEPTIONS_LIST_DESCRIPTION,
    list_id: ENDPOINT_HOST_ISOLATION_EXCEPTIONS_LIST_ID,
    meta: undefined,
    name: ENDPOINT_HOST_ISOLATION_EXCEPTIONS_LIST_NAME,
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
