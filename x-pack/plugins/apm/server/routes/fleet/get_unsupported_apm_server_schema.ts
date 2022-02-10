/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from 'kibana/server';
import {
  APM_SERVER_SCHEMA_SAVED_OBJECT_TYPE,
  APM_SERVER_SCHEMA_SAVED_OBJECT_ID,
} from '../../../common/apm_saved_object_constants';
import {
  apmConfigMapping,
  preprocessLegacyFields,
} from './get_apm_package_policy_definition';

export async function getUnsupportedApmServerSchema({
  savedObjectsClient,
}: {
  savedObjectsClient: SavedObjectsClientContract;
}) {
  const { attributes } = await savedObjectsClient.get(
    APM_SERVER_SCHEMA_SAVED_OBJECT_TYPE,
    APM_SERVER_SCHEMA_SAVED_OBJECT_ID
  );
  const apmServerSchema: Record<string, any> = JSON.parse(
    (attributes as { schemaJson: string }).schemaJson
  );
  const preprocessedApmServerSchema = preprocessLegacyFields({
    apmServerSchema,
  });
  return Object.entries(preprocessedApmServerSchema)
    .filter(([name]) => !(name in apmConfigMapping))
    .map(([key, value]) => ({ key, value }));
}
