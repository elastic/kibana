/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { nodeBuilder } from '@kbn/es-query';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';

import { installationStatuses } from '../../../../../../common/constants';
import { auditLoggingService } from '../../../../audit_logging';
import { PACKAGES_SAVED_OBJECT_TYPE, type Installation } from '../../../../../../common';

export const checkForNamingCollision = async (
  savedObjectsClient: SavedObjectsClientContract,
  integrationName: string
) => {
  const result = await savedObjectsClient.find<Installation>({
    type: PACKAGES_SAVED_OBJECT_TYPE,
    perPage: 1,
    filter: nodeBuilder.and([
      nodeBuilder.is(`${PACKAGES_SAVED_OBJECT_TYPE}.attributes.name`, integrationName),
      // Installed packages
      nodeBuilder.is(
        `${PACKAGES_SAVED_OBJECT_TYPE}.attributes.install_status`,
        installationStatuses.Installed
      ),
    ]),
  });

  if (result.saved_objects.length > 0) {
    throw new NamingCollisionError(
      `Failed to create the integration as a custom integration with the name ${integrationName} already exists.`
    );
  }

  for (const savedObject of result.saved_objects) {
    auditLoggingService.writeCustomSoAuditLog({
      action: 'find',
      id: savedObject.id,
      savedObjectType: PACKAGES_SAVED_OBJECT_TYPE,
    });
  }
};

export class NamingCollisionError extends Error {
  constructor(message?: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'NamingCollisionError';
  }
}
