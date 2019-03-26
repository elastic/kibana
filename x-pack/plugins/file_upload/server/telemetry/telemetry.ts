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
  filesUploadedTypesTotalCounts: object;
  filesUploadedByApp: object;
}

export interface TelemetrySavedObject {
  attributes: Telemetry;
}

export function getInternalRepository(server: Server): any {
  const { getSavedObjectsRepository } = server.savedObjects;
  const callWithInternalUser = callWithInternalUserFactory(server);
  return getSavedObjectsRepository(callWithInternalUser);
}

export function initTelemetry(): Telemetry {
  return {
    filesUploadedTotalCount: 0,
    filesUploadedTypesTotalCounts: {},
    filesUploadedByApp: {},
  };
}

function getInternalRepository(server: Server): any {
  const { getSavedObjectsRepository } = server.savedObjects;
  const callWithInternalUser = callWithInternalUserFactory(server);
  return getSavedObjectsRepository(callWithInternalUser);
}

export async function getTelemetry(server: Server): Promise<Telemetry> {
  const internalRepository = getInternalRepository(server);
  let telemetrySavedObject;

  try {
    telemetrySavedObject = await internalRepository.get(TELEMETRY_DOC_ID, TELEMETRY_DOC_ID);
  } catch (e) {
    // Fail silently
  }

  if (!telemetrySavedObject) {
    telemetrySavedObject = await internalRepository.create(TELEMETRY_DOC_ID, initTelemetry(), {
      id: TELEMETRY_DOC_ID,
    });
  }
  return telemetrySavedObject.attributes;
}

export async function updateTelemetry({
  server,
  app = 'unspecified-app',
  fileType = 'unspecified-file-type',
}: {
  server: Server;
  app: string;
  fileType: string;
}) {
  const telemetry = await getTelemetry(server);
  const internalRepository = getInternalRepository(server);
  const { filesUploadedTotalCount, filesUploadedTypesTotalCounts, filesUploadedByApp } = telemetry;

  await internalRepository.update(TELEMETRY_DOC_ID, TELEMETRY_DOC_ID, {
    filesUploadedTotalCount: filesUploadedTotalCount + 1,
    filesUploadedTypesTotalCounts: {
      ...filesUploadedTypesTotalCounts,
      [fileType]: _.get(filesUploadedTypesTotalCounts, fileType, 0) + 1,
    },
    filesUploadedByApp: {
      ...filesUploadedByApp,
      [app]: {
        ..._.get(filesUploadedByApp, app, {}),
        [fileType]: _.get(filesUploadedByApp, `${app}.${fileType}`, 0) + 1,
      },
    },
  });
}
