/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { PackageClient } from '@kbn/fleet-plugin/server';
import { PackageNotFoundError } from '@kbn/fleet-plugin/server/errors';
import type { RegistryDataStream, RegistrySearchResult } from '@kbn/fleet-plugin/common';
import { IntegrationType } from '../../../common/api_types';

export async function getIntegrationFromPackage({
  pkg,
  packageClient,
  logger,
}: {
  pkg: RegistrySearchResult;
  packageClient: PackageClient;
  logger: Logger;
}) {
  return {
    name: pkg.name,
    title: pkg.title,
    version: pkg.version,
    icons: pkg.icons,
    datasets: await getDatasets({ packageClient, logger, pkg }),
  };
}

export async function getIntegrations(options: {
  packageClient: PackageClient;
  logger: Logger;
}): Promise<IntegrationType[]> {
  const { packageClient, logger } = options;

  const packages = await packageClient.getPackages();
  const installedPackages = packages.filter((p) => p.status === 'installed');

  const integrations = await Promise.all(
    installedPackages.map((pkg) =>
      getIntegrationFromPackage({
        pkg,
        logger,
        packageClient,
      })
    )
  );

  return integrations.filter((integration) => Object.keys(integration.datasets).length > 0);
}

const getDatasets = async (options: {
  packageClient: PackageClient;
  logger: Logger;
  pkg: RegistrySearchResult;
}) => {
  const { packageClient, logger, pkg } = options;

  return (
    (await fetchDatasets({
      packageClient,
      logger,
      name: pkg.name,
      version: pkg.version,
    })) ?? getDatasetsReadableName(pkg.data_streams ?? [])
  );
};

const fetchDatasets = async (options: {
  packageClient: PackageClient;
  logger: Logger;
  name: string;
  version: string;
}) => {
  try {
    const { packageClient, name, version } = options;

    const pkg = await packageClient.getPackage(name, version);

    return getDatasetsReadableName(pkg.packageInfo.data_streams ?? []);
  } catch (error) {
    // Custom integration
    if (error instanceof PackageNotFoundError) {
      return null;
    }

    const { name, version, logger } = options;
    logger.error(
      `There was an error when trying to fetch information about package ${name} version ${version}: ${error}`
    );

    return {};
  }
};

const getDatasetsReadableName = (dataStreams: RegistryDataStream[]) => {
  return dataStreams.reduce(
    (acc, curr) => ({
      ...acc,
      [curr.dataset]: curr.title,
    }),
    {}
  );
};
