/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core/server';
import { INPUT_VAR_NAME_TO_SCHEMA_PATH } from '../../../common/fleet';
import {
  APM_SERVER_SCHEMA_SAVED_OBJECT_TYPE,
  APM_SERVER_SCHEMA_SAVED_OBJECT_ID,
} from '../../../common/apm_saved_object_constants';
import { translateLegacySchemaPaths } from './translate_legacy_schema_paths';

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
  const translatedApmServerSchema = translateLegacySchemaPaths(apmServerSchema);
  const supportedSchemaPaths = Object.values(INPUT_VAR_NAME_TO_SCHEMA_PATH);
  return Object.entries(translatedApmServerSchema)
    .filter(([name]) => !supportedSchemaPaths.includes(name))
    .map(([key, value]) => ({ key, value }));
}
