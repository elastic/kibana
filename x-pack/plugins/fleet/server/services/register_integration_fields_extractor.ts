/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import type { FieldsMetadataServerSetup } from '@kbn/fields-metadata-plugin/server';

import type { FleetStartContract, FleetStartDeps } from '../plugin';

interface RegistrationDeps {
  core: CoreSetup<FleetStartDeps, FleetStartContract>;
  fieldsMetadata: FieldsMetadataServerSetup;
}

export const registerIntegrationFieldsExtractor = ({ core, fieldsMetadata }: RegistrationDeps) => {
  fieldsMetadata.registerIntegrationFieldsExtractor(async ({ integration, dataset }) => {
    const [_core, _startDeps, { packageService }] = await core.getStartServices();

    return packageService.asInternalUser.getPackageFieldsMetadata({
      packageName: integration,
      datasetName: dataset,
    });
  });
};
