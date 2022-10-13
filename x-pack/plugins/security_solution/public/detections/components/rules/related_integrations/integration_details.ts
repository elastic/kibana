/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { capitalize } from 'lodash';
import semver from 'semver';

import type {
  InstalledIntegration,
  InstalledIntegrationArray,
} from '../../../../../common/detection_engine/fleet_integrations';
import type {
  RelatedIntegration,
  RelatedIntegrationArray,
} from '../../../../../common/detection_engine/schemas/common';

export interface IntegrationDetails {
  packageName: string;
  integrationName: string | null;
  integrationTitle: string;

  requiredVersion: string;
  targetVersion: string;
  targetUrl: string;

  installationStatus: KnownInstallationStatus | UnknownInstallationStatus;
}

export interface KnownInstallationStatus {
  isKnown: true;
  isInstalled: boolean;
  isEnabled: boolean;
  isVersionMismatch: boolean;
  installedVersion: string;
}

export interface UnknownInstallationStatus {
  isKnown: false;
}

/**
 * Given an array of integrations and an array of installed integrations this will return an
 * array of integrations augmented with install details like targetVersion, and `version_satisfied`
 * has.
 */
export const calculateIntegrationDetails = (
  relatedIntegrations: RelatedIntegrationArray,
  installedIntegrations: InstalledIntegrationArray | undefined
): IntegrationDetails[] => {
  const integrationMatches = findIntegrationMatches(relatedIntegrations, installedIntegrations);
  const integrationDetails = integrationMatches.map((integration) => {
    return createIntegrationDetails(integration);
  });

  return integrationDetails.sort((a, b) => {
    return a.integrationTitle.localeCompare(b.integrationTitle);
  });
};

interface IntegrationMatch {
  related: RelatedIntegration;
  installed: InstalledIntegration | null;
  isLoaded: boolean;
}

const findIntegrationMatches = (
  relatedIntegrations: RelatedIntegrationArray,
  installedIntegrations: InstalledIntegrationArray | undefined
): IntegrationMatch[] => {
  return relatedIntegrations.map((ri: RelatedIntegration) => {
    if (installedIntegrations == null) {
      return {
        related: ri,
        installed: null,
        isLoaded: false,
      };
    } else {
      const match = installedIntegrations.find(
        (ii: InstalledIntegration) =>
          ii.package_name === ri.package && ii?.integration_name === ri?.integration
      );
      return {
        related: ri,
        installed: match ?? null,
        isLoaded: true,
      };
    }
  });
};

const createIntegrationDetails = (integration: IntegrationMatch): IntegrationDetails => {
  const { related, installed, isLoaded } = integration;

  const packageName = related.package;
  const integrationName = related.integration ?? null;
  const requiredVersion = related.version;

  // We don't know whether the integration is installed or not.
  if (!isLoaded) {
    const integrationTitle = getCapitalizedTitle(packageName, integrationName);
    const targetVersion = getMinimumConcreteVersionMatchingSemver(requiredVersion);
    const targetUrl = buildTargetUrl(packageName, integrationName, targetVersion);

    return {
      packageName,
      integrationName,
      integrationTitle,
      requiredVersion,
      targetVersion,
      targetUrl,
      installationStatus: {
        isKnown: false,
      },
    };
  }

  // We know that the integration is not installed
  if (installed == null) {
    const integrationTitle = getCapitalizedTitle(packageName, integrationName);
    const targetVersion = getMinimumConcreteVersionMatchingSemver(requiredVersion);
    const targetUrl = buildTargetUrl(packageName, integrationName, targetVersion);

    return {
      packageName,
      integrationName,
      integrationTitle,
      requiredVersion,
      targetVersion,
      targetUrl,
      installationStatus: {
        isKnown: true,
        isInstalled: false,
        isEnabled: false,
        isVersionMismatch: false,
        installedVersion: '',
      },
    };
  }

  // We know that the integration is installed
  {
    const integrationTitle = installed.integration_title ?? installed.package_title;

    // Version check e.g. installed version `1.2.3` satisfies required version `~1.2.1`
    const installedVersion = installed.package_version;
    const isVersionSatisfied = semver.satisfies(installedVersion, requiredVersion);
    const targetVersion = isVersionSatisfied
      ? installedVersion
      : getMinimumConcreteVersionMatchingSemver(requiredVersion);

    const targetUrl = buildTargetUrl(packageName, integrationName, targetVersion);

    return {
      packageName,
      integrationName,
      integrationTitle,
      requiredVersion,
      targetVersion,
      targetUrl,
      installationStatus: {
        isKnown: true,
        isInstalled: true,
        isEnabled: installed.is_enabled,
        isVersionMismatch: !isVersionSatisfied,
        installedVersion,
      },
    };
  }
};

const getCapitalizedTitle = (packageName: string, integrationName: string | null): string => {
  return integrationName == null
    ? `${capitalize(packageName)}`
    : `${capitalize(packageName)} ${capitalize(integrationName)}`;
};

const getMinimumConcreteVersionMatchingSemver = (semverString: string): string => {
  return semver.valid(semver.coerce(semverString)) ?? '';
};

const buildTargetUrl = (
  packageName: string,
  integrationName: string | null,
  targetVersion: string
): string => {
  const packageSegment = targetVersion ? `${packageName}-${targetVersion}` : packageName;
  const query = integrationName ? `?integration=${integrationName}` : '';
  return `app/integrations/detail/${packageSegment}/overview${query}`;
};
