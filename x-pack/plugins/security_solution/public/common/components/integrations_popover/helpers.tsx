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
  RelatedIntegration,
  RelatedIntegrationArray,
} from '../../../../common/detection_engine/schemas/common';

/**
 * Returns an `EuiLink` that will link to a given package/integration/version page within fleet
 * @param integration
 * @param basePath
 */
export const getIntegrationLink = (integration: RelatedIntegration, basePath: string) => {
  const integrationURL = `${basePath}/app/integrations/detail/${integration.package}-${
    integration.version
  }/overview${integration.integration ? `?integration=${integration.integration}` : ''}`;
  return (
    <EuiLink href={integrationURL} target="_blank">
      {`${capitalize(integration.package)} ${capitalize(integration.integration)}`}
    </EuiLink>
  );
};

export interface InstalledIntegration extends RelatedIntegration {
  targetVersion: string;
  versionSatisfied?: boolean;
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
  installedIntegrations: RelatedIntegrationArray
): {
  availableIntegrations: RelatedIntegrationArray;
  installedRelatedIntegrations: InstalledIntegration[];
} => {
  const availableIntegrations: RelatedIntegrationArray = [];
  const installedRelatedIntegrations: InstalledIntegration[] = [];

  integrations.forEach((i: RelatedIntegration) => {
    const match = installedIntegrations.find(
      (installed) => installed.package === i.package && installed?.integration === i?.integration
    );
    if (match != null) {
      // Version check e.g. fleet match `1.2.3` satisfies rule dependency `~1.2.1`
      const versionSatisfied = semver.satisfies(match.version, i.version);
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
