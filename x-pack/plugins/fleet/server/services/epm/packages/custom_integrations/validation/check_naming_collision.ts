/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { nodeBuilder } from '@kbn/es-query';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';

import { i18n } from '@kbn/i18n';

import { PackageNotFoundError } from '../../../../../errors';

import { auditLoggingService } from '../../../../audit_logging';
import { PACKAGES_SAVED_OBJECT_TYPE, type Installation } from '../../../../../../common';
import * as Registry from '../../../registry';

export const checkForNamingCollision = async (
  savedObjectsClient: SavedObjectsClientContract,
  integrationName: string
) => {
  try {
    await Registry.fetchFindLatestPackageOrThrow(integrationName);
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
  } catch (error) {
    if (error instanceof NamingCollisionError) {
      throw error;
    }
    if (error instanceof PackageNotFoundError) {
      await checkForCustomNamingCollision(savedObjectsClient, integrationName);
    } else {
      // Unlikely case, but just in case the registry can't be reached etc
      const unknownStatusConflictMessage = i18n.translate(
        'xpack.fleet.customIntegrations.namingCollisionError.unknownStatus',
        {
          defaultMessage:
            'Failed to create the integration as it could not be determined if this package name exists in the registry or as a bundled package.',
        }
      );
      throw new NamingCollisionError(unknownStatusConflictMessage);
    }
  }
};

export const checkForCustomNamingCollision = async (
  savedObjectsClient: SavedObjectsClientContract,
  integrationName: string
) => {
  const result = await savedObjectsClient.find<Installation>({
    type: PACKAGES_SAVED_OBJECT_TYPE,
    perPage: 1,
    filter: nodeBuilder.and([
      nodeBuilder.is(`${PACKAGES_SAVED_OBJECT_TYPE}.attributes.name`, integrationName),
      // Custom packages
      nodeBuilder.is(`${PACKAGES_SAVED_OBJECT_TYPE}.attributes.install_source`, 'custom'),
    ]),
  });

  if (result.saved_objects.length > 0) {
    const customIntegrationConflictMessage = i18n.translate(
      'xpack.fleet.customIntegrations.namingCollisionError.customIntegration',
      {
        defaultMessage:
          'Failed to create the integration as a custom integration with the name {integrationName} already exists.',
        values: {
          integrationName,
        },
      }
    );
    throw new NamingCollisionError(customIntegrationConflictMessage);
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
