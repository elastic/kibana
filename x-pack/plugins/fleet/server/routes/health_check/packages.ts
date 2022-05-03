/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { groupBy } from 'lodash';

import { installationStatuses } from '../../../common';
import { PACKAGES_SAVED_OBJECT_TYPE } from '../../constants';
import { packagePolicyService } from '../../services';
import { getInstallations } from '../../services/epm/packages';

import type { IHealthCheck } from '.';

export const checkPackages: IHealthCheck = async ({
  soClient,
  esClient,
  logger,
  updateReport,
  updateStatus,
}) => {
  let hasProblem = false;
  updateStatus('running');
  updateReport(`Checking integrations...`);

  // Packages in unhealthy state (installing / failed)
  const unhealthyPackages = await getInstallations(soClient, {
    perPage: 100,
    filter: `
        ${PACKAGES_SAVED_OBJECT_TYPE}.attributes.install_status:${installationStatuses.Installing}
        OR ${PACKAGES_SAVED_OBJECT_TYPE}.attributes.install_status:${installationStatuses.InstallFailed}
    `,
  });
  if (unhealthyPackages.total > 0) {
    hasProblem = true;
    updateReport(``);
    updateReport(`Unhealthy integrations:`, 2);
    unhealthyPackages.saved_objects.forEach(
      ({
        attributes: {
          name,
          version,
          install_source: installSource,
          install_started_at: installStartedAt,
          install_status: installStatus,
          install_version: installVersion,
        },
      }) => {
        updateReport(`${name} v${version}`, 3);
        updateReport(
          {
            install_source: installSource,
            install_started_at: installStartedAt,
            install_status: installStatus,
            install_version: installVersion,
          },
          4
        );
      }
    );
    // TODO: Provide guidance on triggering reinstall
    updateReport(`Fleet likely ran into a problem installing these integrations.`, 2);
  }

  // List of used packages and associated policies
  const installedPackages = await getInstallations(soClient, {
    perPage: 100,
    filter: `
        ${PACKAGES_SAVED_OBJECT_TYPE}.attributes.install_status:${installationStatuses.Installed}
    `,
  });
  const packagePolicies = await packagePolicyService.list(soClient, {
    perPage: 10000,
  });
  const packagePoliciesByPackage = groupBy(packagePolicies.items, 'package.name');
  const usedPackages = installedPackages.saved_objects.filter(
    ({ attributes: { name } }) => !!packagePoliciesByPackage[name]
  );
  updateReport(``);
  updateReport(`Integrations in use:`, 2);
  usedPackages.forEach(({ attributes: { name, version } }) => {
    updateReport(`${name} v${version}, policies:`, 3);
    packagePoliciesByPackage[name].forEach((policy) => {
      updateReport(`${policy.name} (id: ${policy.id})`, 4);
      if (policy.package?.version !== version) {
        updateReport(`This policy is using an outdated version: ${policy.package?.version}`, 5);
      }
      // TODO: Check if the package policy is orphaned
    });
  });

  //  List of unused packages and versions
  const unusedPackages = installedPackages.saved_objects.filter(
    ({ attributes }) => !packagePoliciesByPackage[attributes.name]
  );
  updateReport(``);
  updateReport(`Integrations not in use:`, 2);
  updateReport(
    unusedPackages.map(({ attributes: { name, version } }) => `${name} v${version}`),
    3
  );

  // Finish and report overall status for this check
  updateReport(``);
  updateReport(`Finished checking integrations.`);
  updateStatus(hasProblem ? 'problem' : 'healthy');
};
