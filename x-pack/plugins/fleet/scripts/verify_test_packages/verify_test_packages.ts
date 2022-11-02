/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import { readdirSync, statSync } from 'fs';

import type { Logger } from '@kbn/core/server';

import { ToolingLog } from '@kbn/tooling-log';

import { _generatePackageInfoFromPaths } from '../../server/services/epm/archive/parse';

const TEST_PACKAGE_DIRECTORIES = [
  '../../../../test/fleet_api_integration/apis/fixtures/test_packages',
  '../../../../test/fleet_api_integration/apis/fixtures/package_verification/packages',
];

const getAllPathsFromDir = (dir: string): string[] =>
  readdirSync(dir).flatMap((file) => {
    const joinedPath = path.join(dir, file);
    if (!statSync(joinedPath).isDirectory()) return joinedPath;

    return getAllPathsFromDir(joinedPath);
  });

const getAllPackagesFromDir = (packagesDir: string) =>
  readdirSync(packagesDir).flatMap((packageDir) => {
    const packagePath = path.join(packagesDir, packageDir);
    if (!statSync(packagePath).isDirectory()) return [];

    return readdirSync(packagePath)
      .map((version) => path.join(packagePath, version))
      .filter((versionPath) => statSync(versionPath).isDirectory());
  });

export const run = async () => {
  const logger = new ToolingLog({
    level: 'info',
    writeTo: process.stdout,
  });

  const { errorCount } = await verifyAllTestPackages(logger);

  if (errorCount) {
    logger.error(`${errorCount} packages failed validation. Exiting with error.`);
    process.exit(1);
  }
};

export const verifyAllTestPackages = async (
  logger: ToolingLog | Logger
): Promise<{ successCount: number; errorCount: number }> => {
  let errorCount = 0;
  let successCount = 0;
  for (const dir of TEST_PACKAGE_DIRECTORIES) {
    const packageVersionPaths = getAllPackagesFromDir(path.join(__dirname, dir));
    const allPackagePaths = packageVersionPaths.map(getAllPathsFromDir);
    for (const [i, packagePaths] of allPackagePaths.entries()) {
      const topLevelDir = packageVersionPaths[i];
      try {
        const packageInfo = await _generatePackageInfoFromPaths(packagePaths, topLevelDir);
        logger.info(`Successfully parsed ${packageInfo.name}-${packageInfo.version}`);
        successCount++;
      } catch (e) {
        logger.error(`Error parsing ${topLevelDir} : ${e}`);
        errorCount++;
      }
    }
  }

  return { successCount, errorCount };
};
