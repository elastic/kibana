/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from 'kibana/server';
import { LicensingPluginStart } from '../../../licensing/server';

interface PutLicenseArg {
  acknowledge: boolean;
  client: IScopedClusterClient;
  licensing: LicensingPluginStart;
  license: { [key: string]: any };
}

export async function putLicense({ acknowledge, client, licensing, license }: PutLicenseArg) {
  try {
    const response = await client.asCurrentUser.license.post({
      // @ts-expect-error license is not typed in LM code
      body: license,
      acknowledge,
    });
    const { acknowledged, license_status: licenseStatus } = response;

    if (acknowledged && licenseStatus === 'valid') {
      await licensing.refresh();
    }

    return response;
  } catch (error) {
    return error.body;
  }
}
