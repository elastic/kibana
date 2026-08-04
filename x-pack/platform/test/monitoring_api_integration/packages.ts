/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import { createReadStream } from 'fs';
import type SuperTest from 'supertest';

type SupportedPackage = 'beat' | 'elasticsearch' | 'enterprisesearch' | 'logstash' | 'kibana';

const PACKAGES = [
  { name: 'beat', version: '0.1.3' },
  { name: 'elasticsearch', version: '1.4.1' },
  { name: 'enterprisesearch', version: '1.0.0' },
  { name: 'logstash', version: '2.2.2-preview1' },
  { name: 'kibana', version: '2.3.0-preview1' },
];

export const getPackagesArgs = (): string[] => {
  return PACKAGES.flatMap((pkg, i) => {
    return [
      `--xpack.fleet.packages.${i}.name=${pkg.name}`,
      `--xpack.fleet.packages.${i}.version=${pkg.version}`,
    ];
  });
};

export const bundledPackagesLocation = path.join(path.dirname(__filename), '/fixtures/packages');

// The Fleet EPM "install by upload" endpoint is contention-prone under the
// repeated per-suite uploads these tests perform and intermittently answers
// 429/5xx; retry those transient statuses so a single blip doesn't fail setup.
const MAX_UPLOAD_ATTEMPTS = 3;
const TRANSIENT_UPLOAD_STATUSES = [429, 500, 502, 503, 504];

const uploadPackage = (supertest: SuperTest.Agent, zipPath: string): Promise<number> => {
  const request = supertest
    .post('/api/fleet/epm/packages')
    .set('kbn-xsrf', 'xxx')
    .set('content-type', 'application/zip');

  return new Promise<number>((resolve, reject) => {
    createReadStream(zipPath)
      .on('error', reject)
      .on('data', (chunk) => request.write(chunk))
      .on('end', () => {
        request
          .send()
          .then((response) => resolve(response.status))
          .catch(reject);
      });
  });
};

export async function installPackage(
  supertest: SuperTest.Agent,
  packageName: SupportedPackage
): Promise<void> {
  const pkg = PACKAGES.find(({ name }) => name === packageName);
  const zipPath = path.join(bundledPackagesLocation, `${pkg!.name}-${pkg!.version}.zip`);

  for (let attempt = 1; attempt <= MAX_UPLOAD_ATTEMPTS; attempt++) {
    // wait 10s before (re)uploading to avoid getting 429 from the upload endpoint
    await new Promise((resolve) => setTimeout(resolve, 10000));

    const status = await uploadPackage(supertest, zipPath);
    if (status === 200) {
      return;
    }

    if (attempt === MAX_UPLOAD_ATTEMPTS || !TRANSIENT_UPLOAD_STATUSES.includes(status)) {
      throw new Error(
        `Failed to install package "${
          pkg!.name
        }": expected 200 from POST /api/fleet/epm/packages, got ${status} after ${attempt} attempt(s)`
      );
    }
  }
}
