/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
// @ts-ignore
import { getInternalRepository } from '../kibana_server_services';

export const TELEMETRY_DOC_ID = 'file-upload-telemetry';

export interface Telemetry {
  filesUploadedTotalCount: number;
}

export interface TelemetrySavedObject {
  attributes: Telemetry;
}

export function initTelemetry(): Telemetry {
  return {
    filesUploadedTotalCount: 0,
  };
}

export async function getTelemetry(internalRepo?: object): Promise<Telemetry> {
  const internalRepository = internalRepo || getInternalRepository();
  let telemetrySavedObject;

  try {
    telemetrySavedObject = await internalRepository.get(TELEMETRY_DOC_ID, TELEMETRY_DOC_ID);
  } catch (e) {
    // Fail silently
  }

  return telemetrySavedObject ? telemetrySavedObject.attributes : null;
}

export async function updateTelemetry(internalRepo?: any) {
  const internalRepository = internalRepo || getInternalRepository();
  let telemetry = await getTelemetry(internalRepository);
  // Create if doesn't exist
  if (!telemetry || _.isEmpty(telemetry)) {
    const newTelemetrySavedObject = await internalRepository.create(
      TELEMETRY_DOC_ID,
      initTelemetry(),
      { id: TELEMETRY_DOC_ID }
    );
    telemetry = newTelemetrySavedObject.attributes;
  }

  await internalRepository.update(TELEMETRY_DOC_ID, TELEMETRY_DOC_ID, incrementCounts(telemetry));
}

export function incrementCounts({ filesUploadedTotalCount }: { filesUploadedTotalCount: number }) {
  return {
    // TODO: get telemetry for app, total file counts, file type
    filesUploadedTotalCount: filesUploadedTotalCount + 1,
  };
}
