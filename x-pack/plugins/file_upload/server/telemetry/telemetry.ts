/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import _ from 'lodash';
import { callWithInternalUserFactory } from '../client/call_with_internal_user_factory';

export const TELEMETRY_DOC_ID = 'file-upload-telemetry';

export interface Telemetry {
  filesUploadedTotalCount: number;
  filesUploadedTypesTotalCount: object;
  filesUploadedByApp: object;
}

export interface TelemetrySavedObject {
  attributes: Telemetry;
}

export function createTelemetry(count: number = 0): Telemetry {
  return {
    filesUploadedTotalCount: count,
    filesUploadedTypesTotalCount: {},
    filesUploadedByApp: {},
  };
}

export function getSavedObjectsClient(server: Server): any {
  const { SavedObjectsClient, getSavedObjectsRepository } = server.savedObjects;
  const callWithInternalUser = callWithInternalUserFactory(server);
  const internalRepository = getSavedObjectsRepository(callWithInternalUser);
  return new SavedObjectsClient(internalRepository);
}

export async function updateTelemetry(
  internalRepository,
  app = 'unspecified-app',
  fileType = 'unspecified-file-type'
) {
  const nameAndId = 'file-upload-telemetry';

  let telemetrySavedObject;
  try {
    telemetrySavedObject = await internalRepository.get(nameAndId, nameAndId);
  } catch (e) {
    // Fail silently
  }

  if (telemetrySavedObject && telemetrySavedObject.attributes) {
    const {
      filesUploadedTotalCount,
      filesUploadedTypesTotalCount,
      filesUploadedByApp,
    } = telemetrySavedObject.attributes;

    await internalRepository.update(nameAndId, nameAndId, {
      filesUploadedTotalCount: (filesUploadedTotalCount || 0) + 1,
      filesUploadedTypesTotalCount: {
        ...filesUploadedTypesTotalCount,
        [fileType]: _.get(filesUploadedTypesTotalCount, fileType, 0) + 1,
      },
      filesUploadedByApp: {
        ...filesUploadedByApp,
        [app]: {
          ..._.get(filesUploadedByApp, app, {}),
          [fileType]: _.get(filesUploadedByApp, `${app}.${fileType}`, 0) + 1,
        },
      },
    });
  } else {
    await internalRepository.create(
      'file-upload-telemetry',
      {
        filesUploadedTotalCount: 1,
        filesUploadedTypesTotalCount: {
          [fileType]: 1,
        },
        filesUploadedByApp: {
          [app]: {
            [fileType]: 1,
          },
        },
      },
      {
        id: 'file-upload-telemetry',
      }
    );
  }
}
