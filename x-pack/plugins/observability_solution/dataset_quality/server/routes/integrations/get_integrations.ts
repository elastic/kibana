/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { PackageClient } from '@kbn/fleet-plugin/server';
import { PackageNotFoundError } from '@kbn/fleet-plugin/server/errors';
import { PackageListItem, RegistryDataStream } from '@kbn/fleet-plugin/common';
import { DEFAULT_DATASET_TYPE } from '../../../common/constants';
import { DataStreamType } from '../../../common/types';
import { Integration } from '../../../common/api_types';

export async function getIntegrations(options: {
  packageClient: PackageClient;
  logger: Logger;
  type?: DataStreamType;
}): Promise<Integration[]> {
  const { packageClient, logger, type = DEFAULT_DATASET_TYPE } = options;

  const packages = await packageClient.getPackages();
  const installedPackages = packages.filter((p) => p.status === 'installed');

  const integrations = await Promise.all(
    installedPackages.map(async (p) => ({
      name: p.name,
      title: p.title,
      version: p.version,
      icons: p.icons,
      datasets: await getDatasets({ packageClient, logger, pkg: p, type }),
    }))
  );

  return integrations.filter((integration) => Object.keys(integration.datasets).length > 0);
}

const getDatasets = async (options: {
  packageClient: PackageClient;
  logger: Logger;
  pkg: PackageListItem;
  type: DataStreamType;
}) => {
  const { packageClient, logger, pkg, type } = options;

  return (
    (await fetchDatasets({
      packageClient,
      logger,
      name: pkg.name,
      version: pkg.version,
      type,
    })) ?? getDatasetsReadableName(pkg.data_streams ?? [])
  );
};

const fetchDatasets = async (options: {
  packageClient: PackageClient;
  logger: Logger;
  name: string;
  version: string;
  type: DataStreamType;
}) => {
  try {
    const { packageClient, name, version, type } = options;

    const pkg = await packageClient.getPackage(name, version);

    return getDatasetsReadableName(
      (pkg.packageInfo.data_streams ?? []).filter((ds) => ds.type === type)
    );
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
