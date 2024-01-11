/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ENDPOINT_ARTIFACT_LISTS,
  EXCEPTION_LIST_ITEM_URL,
  INTERNAL_EXCEPTIONS_LIST_ENSURE_CREATED_URL,
} from '@kbn/securitysolution-list-constants';
import type { KbnClient } from '@kbn/test';
import type {
  CreateExceptionListSchema,
  ExceptionListItemSchema,
  CreateExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { memoize } from 'lodash';
import { catchAxiosErrorFormatAndThrow } from '../../../common/endpoint/format_axios_error';
import { TRUSTED_APPS_EXCEPTION_LIST_DEFINITION } from '../../../public/management/pages/trusted_apps/constants';
import { EVENT_FILTER_LIST_DEFINITION } from '../../../public/management/pages/event_filters/constants';
import { BLOCKLISTS_LIST_DEFINITION } from '../../../public/management/pages/blocklist/constants';
import { HOST_ISOLATION_EXCEPTIONS_LIST_DEFINITION } from '../../../public/management/pages/host_isolation_exceptions/constants';
import type { NewTrustedApp } from '../../../common/endpoint/types';
import { newTrustedAppToCreateExceptionListItem } from '../../../public/management/pages/trusted_apps/service/mappers';

const ensureArtifactListExists = memoize(
  async (kbnClient: KbnClient, artifactType: keyof typeof ENDPOINT_ARTIFACT_LISTS) => {
    const listId = ENDPOINT_ARTIFACT_LISTS[artifactType].id;
    let listDefinition: CreateExceptionListSchema;

    switch (artifactType) {
      case 'blocklists':
        listDefinition = BLOCKLISTS_LIST_DEFINITION;
        break;

      case 'eventFilters':
        listDefinition = EVENT_FILTER_LIST_DEFINITION;
        break;

      case 'hostIsolationExceptions':
        listDefinition = HOST_ISOLATION_EXCEPTIONS_LIST_DEFINITION;
        break;

      case 'trustedApps':
        listDefinition = TRUSTED_APPS_EXCEPTION_LIST_DEFINITION;
        break;
    }

    await kbnClient
      .request({
        method: 'POST',
        path: INTERNAL_EXCEPTIONS_LIST_ENSURE_CREATED_URL,
        body: {
          ...listDefinition,
          list_id: listId,
        },
        headers: {
          'elastic-api-version': '1',
        },
      })
      .catch(catchAxiosErrorFormatAndThrow);
  },
  (kbnClient: KbnClient, artifactType: string) => {
    return `${artifactType}@[${kbnClient.resolveUrl('')}`;
  }
);

export const createTrustedApp = async (
  kbnClient: KbnClient,
  data: NewTrustedApp
): Promise<ExceptionListItemSchema> => {
  await ensureArtifactListExists(kbnClient, 'trustedApps');

  return kbnClient
    .request<ExceptionListItemSchema>({
      method: 'POST',
      path: EXCEPTION_LIST_ITEM_URL,
      body: newTrustedAppToCreateExceptionListItem(data),
      headers: {
        'elastic-api-version': '2023-10-31',
      },
    })
    .catch(catchAxiosErrorFormatAndThrow)
    .then((response) => response.data);
};

export const createEventFilter = async (
  kbnClient: KbnClient,
  data: CreateExceptionListItemSchema
): Promise<ExceptionListItemSchema> => {
  await ensureArtifactListExists(kbnClient, 'eventFilters');

  return kbnClient
    .request<ExceptionListItemSchema>({
      method: 'POST',
      path: EXCEPTION_LIST_ITEM_URL,
      body: data,
      headers: {
        'elastic-api-version': '2023-10-31',
      },
    })
    .catch(catchAxiosErrorFormatAndThrow)
    .then((response) => response.data);
};
