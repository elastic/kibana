/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { LicensingPluginSetup } from '../../../licensing/server';
import { CallAsCurrentUser } from '../types';

const getLicensePath = (acknowledge: boolean) =>
  `/_license${acknowledge ? '?acknowledge=true' : ''}`;

interface PutLicenseArg {
  acknowledge: boolean;
  callAsCurrentUser: CallAsCurrentUser;
  licensing: LicensingPluginSetup;
  license: { [key: string]: any };
}

export async function putLicense({
  acknowledge,
  callAsCurrentUser,
  licensing,
  license,
}: PutLicenseArg) {
  const options = {
    method: 'POST',
    path: getLicensePath(acknowledge),
    body: license,
  };

  try {
    const response = await callAsCurrentUser('transport.request', options);
    const { acknowledged, license_status: licenseStatus } = response;

    if (acknowledged && licenseStatus === 'valid') {
      await licensing.refresh();
    }

    return response;
  } catch (error) {
    return error.body;
  }
}
