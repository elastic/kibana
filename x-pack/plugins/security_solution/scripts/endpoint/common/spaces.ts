/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/test';
import { AxiosError } from 'axios';
import type { ToolingLog } from '@kbn/tooling-log';
import type { Space } from '@kbn/spaces-plugin/common';
import { DEFAULT_SPACE_ID, getSpaceIdFromPath } from '@kbn/spaces-plugin/common';
import { memoize } from 'lodash';
import { createToolingLogger } from '../../../common/endpoint/data_loaders/utils';
import { catchAxiosErrorFormatAndThrow } from '../../../common/endpoint/format_axios_error';

/**
 * Check that a given space id exists in Kibana and created it if not.
 */
export const ensureSpaceIdExists = async (
  kbnClient: KbnClient,
  /** If space id is not defined, it will be derived from the `KbnClient` kibana url */
  spaceId: string = getSpaceIdFromKbnClientUrl(kbnClient).spaceId,
  { log = createToolingLogger() }: { log?: ToolingLog } = {}
): Promise<void> => {
  if (!spaceId || spaceId === DEFAULT_SPACE_ID) {
    return;
  }

  const alreadyExists = await kbnClient.spaces
    .get(spaceId)
    .then(() => {
      log.debug(`Space id [${spaceId}] already exists. Nothing to do.`);
      return true;
    })
    .catch((err) => {
      if (err instanceof AxiosError && (err.response?.status ?? err.status) === 404) {
        return false;
      }

      throw err;
    })
    .catch(catchAxiosErrorFormatAndThrow);

  if (!alreadyExists) {
    log.info(`Creating space id [${spaceId}]`);

    await kbnClient.spaces
      .create({
        name: spaceId,
        id: spaceId,
      })
      .catch(catchAxiosErrorFormatAndThrow);
  }
};

/**
 * Get the current active space for the provided KbnClient
 *
 * NOTE:  this utility may generate a `404` error if the `KbnClient` has been
 *        initialized for a specific space, but that space does not yet exist.
 *
 * @param kbnClient
 */
export const fetchActiveSpace = memoize(async (kbnClient: KbnClient): Promise<Space> => {
  return kbnClient
    .request<Space>({
      method: 'GET',
      path: `/internal/spaces/_active_space`,
    })
    .catch(catchAxiosErrorFormatAndThrow)
    .then((response) => response.data);
});

/**
 * Returns the space id that the provided KbnClient was initialized for by parsting its url
 * @param kbnClient
 */
export const getSpaceIdFromKbnClientUrl = (
  kbnClient: KbnClient
): ReturnType<typeof getSpaceIdFromPath> => {
  const newUrl = new URL(kbnClient.resolveUrl('/'));

  return getSpaceIdFromPath(newUrl.pathname); // NOTE: we are not currently supporting a Kibana base path prefix
};
