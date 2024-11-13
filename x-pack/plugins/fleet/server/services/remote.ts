/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';

import { PACKAGES_SAVED_OBJECT_TYPE, SO_SEARCH_LIMIT } from '../constants';
import {
  FLEET_SYNTHETICS_PACKAGE,
  FLEET_SERVER_PACKAGE,
  FLEET_ELASTIC_AGENT_PACKAGE,
} from '../../common/constants';
import type { Installation } from '../types';

import { appContextService } from './app_context';

class RemoteClusterService {
  /**
   * Install packages that are installed on current stack into remote stack if they are not
   * already installed there.
   */
  public async syncPackagesWithRemote(
    soClient: SavedObjectsClientContract,
    kibanaUrl: string,
    apiKey: string
  ) {
    const logger = appContextService.getLogger();
    const cleanedKibanaUrl = kibanaUrl.replace(/\/+$/, '');

    // List installed packages
    const installedPackagesRes = await soClient.find<Installation>({
      type: PACKAGES_SAVED_OBJECT_TYPE,
      perPage: SO_SEARCH_LIMIT,
      filter: `${PACKAGES_SAVED_OBJECT_TYPE}.attributes.install_status:installed`,
    });
    // TODO: check if some packages should be skipped
    const packagesToSkip = [
      FLEET_ELASTIC_AGENT_PACKAGE,
      FLEET_SERVER_PACKAGE,
      FLEET_SYNTHETICS_PACKAGE,
    ];
    const installedPackages = installedPackagesRes.saved_objects
      .map((so) => ({
        name: so.attributes.name,
        version: so.attributes.version,
      }))
      .filter((p) => !packagesToSkip.includes(p.name));

    // List installed packages on remote
    const installedPackagesOnRemoteRes = await fetch(
      `${cleanedKibanaUrl}/api/fleet/epm/packages/installed`,
      {
        headers: {
          'content-type': 'application/json',
          'kbn-xsrf': 'true',
          Authorization: `ApiKey ${apiKey}`,
        },
        method: 'GET',
      }
    );
    if (!installedPackagesOnRemoteRes.ok) {
      logger.error(
        `Failed to retrieve installed packages on remote cluster: ${installedPackagesOnRemoteRes.statusText}`
      );
      return;
    }
    const body = await installedPackagesOnRemoteRes.json();
    const installedPackagesOnRemote = body.items;

    // Install missing packages on remote
    const packagesToInstall = installedPackages.filter(
      (localPackage) =>
        !installedPackagesOnRemote.some(
          (remotePackage: { name: string; version: string }) =>
            localPackage.name === remotePackage.name &&
            localPackage.version === remotePackage.version
        )
    );
    if (packagesToInstall.length === 0) {
      logger.debug('All integrations already installed on remote');
      return;
    }

    logger.debug(
      `Installing following integrations on remote cluster: ${packagesToInstall
        .map((p) => `${p.name}:${p.version}`)
        .join(', ')}`
    );
    const res = await fetch(`${cleanedKibanaUrl}/api/fleet/epm/packages/_bulk`, {
      headers: {
        'content-type': 'application/json',
        'kbn-xsrf': 'true',
        Authorization: `ApiKey ${apiKey}`,
      },
      method: 'POST',
      body: JSON.stringify({ packages: packagesToInstall }),
    });
    if (res.ok) {
      logger.debug('Integrations installed on remote cluster');
    } else {
      logger.error(`Failed to install packages on remote cluster: ${res.statusText}`);
    }
  }
}

export const remoteClusterService = new RemoteClusterService();
