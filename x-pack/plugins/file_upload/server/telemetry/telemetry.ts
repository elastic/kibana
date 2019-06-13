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
  };
}

export async function getTelemetry(server: Server, internalRepo?: object): Promise<Telemetry> {
  const internalRepository = internalRepo || getInternalRepository(server);
  let telemetrySavedObject;

  try {
    telemetrySavedObject = await internalRepository.get(TELEMETRY_DOC_ID, TELEMETRY_DOC_ID);
  } catch (e) {
    // Fail silently
  }

  if (!telemetrySavedObject || _.isEmpty(telemetrySavedObject)) {
    telemetrySavedObject = await internalRepository.create(TELEMETRY_DOC_ID, initTelemetry(), {
      id: TELEMETRY_DOC_ID,
    });
  }
  return telemetrySavedObject.attributes;
}

export async function updateTelemetry({
  server,
  internalRepo,
}: {
  server: any;
  internalRepo?: object;
}) {
  const telemetry = await getTelemetry(server, internalRepo);
  const internalRepository = internalRepo || getInternalRepository(server);

  await internalRepository.update(TELEMETRY_DOC_ID, TELEMETRY_DOC_ID, incrementCounts(telemetry));
}

export function incrementCounts({ filesUploadedTotalCount }: { filesUploadedTotalCount: number }) {
  return {
    // TODO: get telemetry for app, total file counts, file type
    filesUploadedTotalCount: filesUploadedTotalCount + 1,
  };
}
