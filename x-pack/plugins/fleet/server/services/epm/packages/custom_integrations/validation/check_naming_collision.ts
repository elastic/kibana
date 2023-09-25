/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { nodeBuilder } from '@kbn/es-query';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';

import { i18n } from '@kbn/i18n';

import { auditLoggingService } from '../../../../audit_logging';
import { PACKAGES_SAVED_OBJECT_TYPE, type Installation } from '../../../../../../common';
import * as Registry from '../../../registry';

export const checkForNamingCollision = async (
  savedObjectsClient: SavedObjectsClientContract,
  integrationName: string
) => {
  await checkForRegistryNamingCollision(savedObjectsClient, integrationName);
  await checkForInstallationNamingCollision(savedObjectsClient, integrationName);
};

export const checkForRegistryNamingCollision = async (
  savedObjectsClient: SavedObjectsClientContract,
  integrationName: string
) => {
  const registryOrBundledPackage = await Registry.fetchFindLatestPackageOrUndefined(
    integrationName
  );
  if (registryOrBundledPackage) {
    const registryConflictMessage = i18n.translate(
      'xpack.fleet.customIntegrations.namingCollisionError.registryOrBundle',
      {
        defaultMessage:
          'Failed to create the integration as an integration with the name {integrationName} already exists in the package registry or as a bundled package.',
        values: {
          integrationName,
        },
      }
    );
    throw new NamingCollisionError(registryConflictMessage);
  }
};

export const checkForInstallationNamingCollision = async (
  savedObjectsClient: SavedObjectsClientContract,
  integrationName: string
) => {
  const result = await savedObjectsClient.find<Installation>({
    type: PACKAGES_SAVED_OBJECT_TYPE,
    perPage: 1,
    filter: nodeBuilder.and([
      nodeBuilder.is(`${PACKAGES_SAVED_OBJECT_TYPE}.attributes.name`, integrationName),
    ]),
  });

  if (result.saved_objects.length > 0) {
    const installationConflictMessage = i18n.translate(
      'xpack.fleet.customIntegrations.namingCollisionError.installationConflictMessage',
      {
        defaultMessage:
          'Failed to create the integration as an installation with the name {integrationName} already exists.',
        values: {
          integrationName,
        },
      }
    );
    throw new NamingCollisionError(installationConflictMessage);
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
