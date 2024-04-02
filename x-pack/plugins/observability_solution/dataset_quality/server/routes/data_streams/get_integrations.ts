/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { DASHBOARD_SAVED_OBJECT_TYPE } from '@kbn/deeplinks-analytics/constants';
import { PackageClient } from '@kbn/fleet-plugin/server';
import { PackageNotFoundError } from '@kbn/fleet-plugin/server/errors';
import { Dashboard, DataStreamStat, Integration } from '../../../common/api_types';

export async function getIntegrationDashboards(
  packageClient: PackageClient,
  savedObjectsClient: SavedObjectsClientContract,
  integration: string
): Promise<Dashboard[]> {
  // Retrieve integration savedObject
  const integrationSavedObjects = await packageClient.getInstallation(integration);
  if (!integrationSavedObjects) return [];

  // Extract dashboard ids
  const dashboardIds: string[] = [];
  integrationSavedObjects.installed_kibana.forEach((intSavedObject) => {
    if (intSavedObject.type === DASHBOARD_SAVED_OBJECT_TYPE) {
      dashboardIds.push(intSavedObject.id);
    }
  });

  // Fetch dashboards savedObject
  // We are directly querying the SO here
  // The dashboard service is not exposed from the server side at the moment
  // https://github.com/elastic/kibana/issues/179759
  const dashboardsSavedObjects = await savedObjectsClient.bulkGet<{
    title?: string;
  }>(
    dashboardIds.map((id) => ({
      id,
      type: DASHBOARD_SAVED_OBJECT_TYPE,
      fields: ['title'],
    }))
  );

  // Ignore faulty dashboards
  const allValidDashboardSavedObjects = dashboardsSavedObjects.saved_objects.filter(
    (so) => !so.error
  );

  // Construct dashboard result
  const packageDashboards = allValidDashboardSavedObjects.map((so) => ({
    id: so.id,
    title: so.attributes.title || so.id,
  }));

  return packageDashboards;
}

export async function getIntegrations(options: {
  packageClient: PackageClient;
  dataStreams: DataStreamStat[];
}): Promise<Integration[]> {
  const { packageClient, dataStreams } = options;

  const packages = await packageClient.getPackages();
  const installedPackages = dataStreams.map((item) => item.integration);

  return Promise.all(
    packages
      .filter((pkg) => installedPackages.includes(pkg.name))
      .map(async (p) => ({
        name: p.name,
        title: p.title,
        version: p.version,
        icons: p.icons,
        datasets: await getDatasets({
          packageClient,
          name: p.name,
          version: p.version,
        }),
      }))
  );
}

const getDatasets = async (options: {
  packageClient: PackageClient;
  name: string;
  version: string;
}) => {
  try {
    const { packageClient, name, version } = options;

    const pkg = await packageClient.getPackage(name, version);

    return pkg.packageInfo.data_streams?.reduce(
      (acc, curr) => ({
        ...acc,
        [curr.dataset]: curr.title,
      }),
      {}
    );
  } catch (error) {
    // Custom integration
    if (error instanceof PackageNotFoundError) {
      return {};
    }

    throw error;
  }
};
