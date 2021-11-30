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
import { AxiosError, AxiosResponse } from 'axios';
import { indexFleetEndpointPolicy } from '../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import {
  PACKAGE_POLICY_API_ROUTES,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
} from '../../../../fleet/common/constants';
import { HostIsolationExceptionGenerator } from '../../../common/endpoint/data_generators/host_isolation_exception_generator';
import { setupFleetForEndpoint } from '../../../common/endpoint/data_loaders/setup_fleet_for_endpoint';
import { GetPolicyListResponse } from '../../../public/management/pages/policy/types';

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

  log.info('Setting up fleet');
  await setupFleetForEndpoint(kbn);

  log.info('Creating Host isolation exceptions list');
  await ensureCreateEndpointHostIsolationExceptionList(kbn);

  // Setup a list of real endpoint policies and return a method to randomly select one
  const randomPolicyId: () => string = await (async () => {
    const randomN = (max: number): number => Math.floor(Math.random() * max);
    const policyIds: string[] =
      (await fetchEndpointPolicies(kbn)).data.items.map((policy) => policy.id) || [];

    // If the number of existing policies is less than 5, then create some more policies
    if (policyIds.length < 5) {
      for (let i = 0, t = 5 - policyIds.length; i < t; i++) {
        policyIds.push(
          (
            await indexFleetEndpointPolicy(
              kbn,
              `Policy for Host Isolation Exceptions assignment ${i + 1}`
            )
          ).integrationPolicies[0].id
        );
      }
    }

    return () => policyIds[randomN(policyIds.length)];
  })();

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
      log.write(' . ');
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

const fetchEndpointPolicies = (
  kbnClient: KbnClient
): Promise<AxiosResponse<GetPolicyListResponse>> => {
  return kbnClient.request<GetPolicyListResponse>({
    method: 'GET',
    path: PACKAGE_POLICY_API_ROUTES.LIST_PATTERN,
    query: {
      perPage: 100,
      kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name: endpoint`,
    },
  });
};
