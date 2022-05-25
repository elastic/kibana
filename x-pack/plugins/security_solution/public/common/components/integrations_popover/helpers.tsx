/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink } from '@elastic/eui';
import { capitalize } from 'lodash';
import React from 'react';
import semver from 'semver';
import {
  InstalledIntegration,
  InstalledIntegrationArray,
  RelatedIntegration,
  RelatedIntegrationArray,
} from '../../../../common/detection_engine/schemas/common';

/**
 * Returns an `EuiLink` that will link to a given package/integration/version page within fleet
 * TODO: Add `title` to RelatedIntegration so we can accurately display the integration pretty name
 *
 * @param integration either RelatedIntegration or InstalledIntegration
 * @param basePath kbn basepath for composing the fleet URL
 */
export const getIntegrationLink = (
  integration: RelatedIntegration | InstalledIntegration,
  basePath: string
) => {
  let packageName: string;
  let integrationName: string | undefined;
  let integrationTitle: string;
  let version: string | null;

  // InstalledIntegration
  if ('package_name' in integration) {
    packageName = integration.package_name;
    integrationName = integration.integration_name;
    integrationTitle = integration.integration_title ?? integration.package_name;
    version = integration.package_version;
  } else {
    // RelatedIntegration
    packageName = integration.package;
    integrationName = integration.integration;
    integrationTitle = `${capitalize(integration.package)} ${capitalize(integration.integration)}`;
    version = semver.valid(semver.coerce(integration.version));
  }

  const integrationURL =
    version != null
      ? `${basePath}/app/integrations/detail/${packageName}-${version}/overview${
          integrationName ? `?integration=${integrationName}` : ''
        }`
      : `${basePath}/app/integrations/detail/${packageName}`;
  return (
    <EuiLink href={integrationURL} target="_blank">
      {integrationTitle}
    </EuiLink>
  );
};

export interface InstalledIntegrationAugmented extends InstalledIntegration {
  targetVersion: string;
  versionSatisfied: boolean;
}

/**
 * Given an array of integrations and an array of installed integrations this will return which
 * integrations are `available`/`uninstalled` and which are `installed`, and also augmented with
 * `targetVersion` and `versionSatisfied`
 * @param integrations
 * @param installedIntegrations
 */
export const getInstalledRelatedIntegrations = (
  integrations: RelatedIntegrationArray,
  installedIntegrations: InstalledIntegrationArray
): {
  availableIntegrations: RelatedIntegrationArray;
  installedRelatedIntegrations: InstalledIntegrationAugmented[];
} => {
  const availableIntegrations: RelatedIntegrationArray = [];
  const installedRelatedIntegrations: InstalledIntegrationAugmented[] = [];

  integrations.forEach((i: RelatedIntegration) => {
    const match = installedIntegrations.find(
      (installed) =>
        installed.package_name === i.package && installed?.integration_name === i?.integration
    );
    if (match != null) {
      // Version check e.g. fleet match `1.2.3` satisfies rule dependency `~1.2.1`
      const versionSatisfied = semver.satisfies(match.package_version, i.version);
      installedRelatedIntegrations.push({ ...match, targetVersion: i.version, versionSatisfied });
    } else {
      availableIntegrations.push(i);
    }
  });

  return {
    availableIntegrations,
    installedRelatedIntegrations,
  };
};
