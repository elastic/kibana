/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import semverLte from 'semver/functions/lte';
import { ImmutableArray } from '../../types';

const minSupportedVersion = '7.14.0';
const minCapabilitiesVersion = '7.15.0';
const supportedOssMap = {
  macos: true,
  windows: true,
};
const isolationCapability = 'isolation';

function parseSemver(semver: string) {
  return semver.includes('-') ? semver.substring(0, semver.indexOf('-')) : semver;
}

export const isVersionSupported = ({
  currentVersion,
  minVersionRequired = minSupportedVersion,
}: {
  currentVersion: string;
  minVersionRequired?: string;
}) => {
  const parsedCurrentVersion = parseSemver(currentVersion);
  return semverLte(minVersionRequired, parsedCurrentVersion);
};

export const isOsSupported = ({
  currentOs,
  supportedOss = supportedOssMap,
}: {
  currentOs: string;
  supportedOss?: { [os: string]: boolean };
}) => !!supportedOss[currentOs];

function isCapabilitiesSupported(semver: string): boolean {
  const parsedVersion = parseSemver(semver);
  // capabilities is only available from 7.15+
  return semverLte(minCapabilitiesVersion, parsedVersion);
}

function isIsolationSupportedCapabilities(capabilities: ImmutableArray<string> = []): boolean {
  return capabilities.includes(isolationCapability);
}

// capabilities isn't introduced until 7.15 so check the OS for support
function isIsolationSupportedOS(osName: string): boolean {
  const normalizedOs = osName.toLowerCase();
  return isOsSupported({ currentOs: normalizedOs });
}

export const isIsolationSupported = ({
  osName,
  version,
  capabilities,
}: {
  osName: string;
  version: string;
  capabilities?: ImmutableArray<string>;
}): boolean => {
  if (!version || !isVersionSupported({ currentVersion: version })) return false;

  return isCapabilitiesSupported(version)
    ? isIsolationSupportedCapabilities(capabilities)
    : isIsolationSupportedOS(osName);
};
