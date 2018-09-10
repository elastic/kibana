/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export async function getTelemetryOptIn(request) {
  const savedObjectsClient = request.getSavedObjectsClient();

  try {
    const { attributes } = await savedObjectsClient.get('telemetry', 'telemetry');
    return attributes.enabled;
  } catch (error) {
    if (savedObjectsClient.errors.isNotFoundError(error)) {
      return null;
    }
    throw error;
  }
}
