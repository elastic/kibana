/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

// @ts-ignore
import binary_info from '@elastic/nodegit/dist/utils/binary_info';

export function binaryInfo(platform: string, arch: string) {
  const info = binary_info(platform, arch);
  const downloadUrl = info.hosted_tarball;
  const packageName = info.package_name;
  return {
    downloadUrl,
    packageName,
  };
}
