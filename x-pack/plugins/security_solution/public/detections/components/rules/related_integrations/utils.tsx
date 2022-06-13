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
} from '../../../../../common/detection_engine/schemas/common';

/**
 * Returns an `EuiLink` that will link to a given package/integration/version page within fleet
 *
 * @param integration IntegrationDetails describing a package/integrations installed state
 * @param basePath kbn basepath for composing the fleet URL
 */
export const getIntegrationLink = (integration: IntegrationDetails, basePath: string) => {
  const packageName = integration.package_name;
  const integrationName = integration.integration_name;
  const integrationTitle = integration.integration_title ?? integration.package_title;
  const version = integration.version_satisfied
    ? integration.package_version
    : integration.target_version;

  const integrationURL =
    version !== ''
      ? `${basePath}/app/integrations/detail/${packageName}-${version}/overview${
          integrationName ? `?integration=${integrationName}` : ''
        }`
      : `${basePath}/app/integrations/detail/${packageName}`;
  return (
    <EuiLink href={integrationURL} target="_blank" data-test-subj={'integrationLink'}>
      {integrationTitle}
    </EuiLink>
  );
};

export interface IntegrationDetails extends InstalledIntegration {
  target_version: string;
  version_satisfied: boolean;
  is_installed: boolean;
}

/**
 * Given an array of integrations and an array of installed integrations this will return an
 * array of integrations augmented with install details like targetVersion, and `version_satisfied`
 * has
 * @param integrations
 * @param installedIntegrations
 */
export const getInstalledRelatedIntegrations = (
  integrations: RelatedIntegrationArray,
  installedIntegrations: InstalledIntegrationArray | undefined
): IntegrationDetails[] => {
  const integrationDetails: IntegrationDetails[] = [];

  integrations.forEach((i: RelatedIntegration) => {
    const match = installedIntegrations?.find(
      (installed) =>
        installed.package_name === i.package && installed?.integration_name === i?.integration
    );

    if (match != null) {
      // Version check e.g. fleet match `1.2.3` satisfies rule dependency `~1.2.1`
      const versionSatisfied = semver.satisfies(match.package_version, i.version);
      const packageVersion = versionSatisfied
        ? i.version
        : semver.valid(semver.coerce(i.version)) ?? '';
      integrationDetails.push({
        ...match,
        target_version: packageVersion,
        version_satisfied: versionSatisfied,
        is_installed: true,
      });
    } else {
      const packageVersion = semver.valid(semver.coerce(i.version)) ?? '';
      // TODO: Add `title` to RelatedIntegration (or fetch from Fleet API) so we can accurately display the integration pretty name
      const integrationTitle =
        i.integration != null ? `${capitalize(i.package)} ${capitalize(i.integration)}` : undefined;
      integrationDetails.push({
        package_name: i.package,
        package_title: capitalize(i.package),
        package_version: packageVersion,
        integration_name: i.integration,
        integration_title: integrationTitle,
        target_version: packageVersion,
        version_satisfied: false,
        is_enabled: false,
        is_installed: false,
      });
    }
  });

  return integrationDetails.sort((a, b) => {
    if (a.integration_title != null && b.integration_title != null) {
      return a.integration_title.localeCompare(b.integration_title);
    } else if (a.integration_title != null) {
      return a.integration_title.localeCompare(b.package_title);
    } else if (b.integration_title != null) {
      return a.package_title.localeCompare(b.integration_title);
    } else {
      return a.package_title.localeCompare(b.package_title);
    }
  });
};
