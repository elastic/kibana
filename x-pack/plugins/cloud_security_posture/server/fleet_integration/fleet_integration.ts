/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/core/server';
import { SavedObjectsClientContract } from '@kbn/core/server';
import { PackagePolicyClient } from '@kbn/fleet-plugin/server';
import { PackagePolicy } from '@kbn/fleet-plugin/common';
import { DataViewSavedObjectAttrs } from '@kbn/data-views-plugin/common';
import { CSP_FLEET_PACKAGE_KUERY } from '../../common/utils/helpers';
import { CLOUD_SECURITY_POSTURE_PACKAGE_NAME } from '../../common/constants';

export const onPackagePolicyPostCreateCallback = async (
  logger: Logger,
  packagePolicy: PackagePolicy,
  savedObjectsClient: SavedObjectsClientContract
): Promise<void> => {
  return addDataViewToAllSpaces(savedObjectsClient);
};

async function addDataViewToAllSpaces(savedObjectsClient: SavedObjectsClientContract) {
  const cspmDataViews = await savedObjectsClient.find<DataViewSavedObjectAttrs>({
    type: 'index-pattern',
    fields: ['title'],
    search: CLOUD_SECURITY_POSTURE_PACKAGE_NAME + '*',
    searchFields: ['title'],
    perPage: 100,
  });

  cspmDataViews.saved_objects.forEach((dataView) => {
    savedObjectsClient.updateObjectsSpaces([{ id: dataView.id, type: 'index-pattern' }], ['*'], []);
  });
}

export const isCspPackagePolicyInstalled = async (
  packagePolicyClient: PackagePolicyClient,
  soClient: SavedObjectsClientContract,
  logger: Logger
): Promise<boolean> => {
  try {
    const { total } = await packagePolicyClient.list(soClient, {
      kuery: CSP_FLEET_PACKAGE_KUERY,
      page: 1,
    });

    return total > 0;
  } catch (e) {
    logger.error(e);
    return false;
  }
};
