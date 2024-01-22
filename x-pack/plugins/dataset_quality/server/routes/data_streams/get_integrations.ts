/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PackageClient } from '@kbn/fleet-plugin/server';
import { DataStreamStat, Integration } from '../../../common/api_types';

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
  const { packageClient, name, version } = options;

  const pkg = await packageClient.getPackage(name, version);

  return pkg.packageInfo.data_streams?.reduce(
    (acc, curr) => ({
      ...acc,
      [curr.dataset]: curr.title,
    }),
    {}
  );
};
