/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandler } from 'src/core/server';
import { TypeOf } from '@kbn/config-schema';
import {
  GetEnrollmentAPIKeysRequestSchema,
  PostEnrollmentAPIKeyRequestSchema,
  DeleteEnrollmentAPIKeyRequestSchema,
  GetOneEnrollmentAPIKeyRequestSchema,
} from '../../types';
import {
  GetEnrollmentAPIKeysResponse,
  GetOneEnrollmentAPIKeyResponse,
  DeleteEnrollmentAPIKeyResponse,
  PostEnrollmentAPIKeyResponse,
} from '../../../common';
import * as APIKeyService from '../../services/api_keys';
import { defaultIngestErrorHandler } from '../../errors';

export const getEnrollmentApiKeysHandler: RequestHandler<
  undefined,
  TypeOf<typeof GetEnrollmentAPIKeysRequestSchema.query>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  try {
    const { items, total, page, perPage } = await APIKeyService.listEnrollmentApiKeys(soClient, {
      page: request.query.page,
      perPage: request.query.perPage,
      kuery: request.query.kuery,
    });
    const body: GetEnrollmentAPIKeysResponse = { list: items, total, page, perPage };

    return response.ok({ body });
  } catch (error) {
    return defaultIngestErrorHandler({ error, response });
  }
};
export const postEnrollmentApiKeyHandler: RequestHandler<
  undefined,
  undefined,
  TypeOf<typeof PostEnrollmentAPIKeyRequestSchema.body>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  try {
    const apiKey = await APIKeyService.generateEnrollmentAPIKey(soClient, {
      name: request.body.name,
      expiration: request.body.expiration,
      agentPolicyId: request.body.policy_id,
    });

    const body: PostEnrollmentAPIKeyResponse = { item: apiKey, action: 'created' };

    return response.ok({ body });
  } catch (error) {
    return defaultIngestErrorHandler({ error, response });
  }
};

export const deleteEnrollmentApiKeyHandler: RequestHandler<
  TypeOf<typeof DeleteEnrollmentAPIKeyRequestSchema.params>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  try {
    await APIKeyService.deleteEnrollmentApiKey(soClient, request.params.keyId);

    const body: DeleteEnrollmentAPIKeyResponse = { action: 'deleted' };

    return response.ok({ body });
  } catch (error) {
    if (error.isBoom && error.output.statusCode === 404) {
      return response.notFound({
        body: { message: `EnrollmentAPIKey ${request.params.keyId} not found` },
      });
    }
    return defaultIngestErrorHandler({ error, response });
  }
};

export const getOneEnrollmentApiKeyHandler: RequestHandler<
  TypeOf<typeof GetOneEnrollmentAPIKeyRequestSchema.params>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  try {
    const apiKey = await APIKeyService.getEnrollmentAPIKey(soClient, request.params.keyId);
    const body: GetOneEnrollmentAPIKeyResponse = { item: apiKey };

    return response.ok({ body });
  } catch (error) {
    if (error.isBoom && error.output.statusCode === 404) {
      return response.notFound({
        body: { message: `EnrollmentAPIKey ${request.params.keyId} not found` },
      });
    }

    return defaultIngestErrorHandler({ error, response });
  }
};
