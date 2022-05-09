/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { groupBy, keyBy } from 'lodash';

import { installationStatuses } from '../../../common';
import { PACKAGES_SAVED_OBJECT_TYPE } from '../../constants';
import { packagePolicyService, agentPolicyService } from '../../services';
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
    // TODO: Provide guidance on triggering uninstall/reinstall
    updateReport(`Fleet likely ran into a problem installing these integrations.`, 2);
  }

  // List of used packages and associated policies
  // Including identifing orphaned ones
  const installedPackages = await getInstallations(soClient, {
    perPage: 100,
    filter: `
        ${PACKAGES_SAVED_OBJECT_TYPE}.attributes.install_status:${installationStatuses.Installed}
    `,
  });
  const orphanedPackagePolicies: string[] = [];
  const packagePolicies = await packagePolicyService.list(soClient, {
    perPage: 10000,
  });
  const packagePoliciesByPackage = groupBy(packagePolicies.items, 'package.name');
  const agentPolicies = await agentPolicyService.list(soClient, {
    perPage: 10000,
  });
  const agentPoliciesById = keyBy(agentPolicies.items, 'id');
  const usedPackages = installedPackages.saved_objects.filter(
    ({ attributes: { name } }) => !!packagePoliciesByPackage[name]
  );
  if (usedPackages.length > 0) {
    updateReport(``);
    updateReport(`Integrations in use:`, 2);
    usedPackages.forEach(({ attributes: { name, version } }) => {
      updateReport(`${name} v${version}, policies:`, 3);
      packagePoliciesByPackage[name].forEach((packagePolicy) => {
        updateReport(`${packagePolicy.name} (id: ${packagePolicy.id})`, 4);
        if (packagePolicy.package?.version !== version) {
          updateReport(
            `This policy is using an outdated version: ${packagePolicy.package?.version}`,
            5
          );
        }
        if (!agentPoliciesById[packagePolicy.policy_id]) {
          orphanedPackagePolicies.push(packagePolicy.id);
        }
      });
    });
  }

  // Report orphaned package policies
  if (orphanedPackagePolicies.length > 0) {
    hasProblem = true;
    updateReport(``);
    updateReport(
      `The following integration policies are orphaned (detached from a parent agent policy):`,
      2
    );
    updateReport(orphanedPackagePolicies, 3);
    updateReport(`Run the following command in Kibana > Dev Tools > Console to remove them:`, 2);
    updateReport(`POST /api/fleet/package_policies/delete`, 3);
    updateReport(
      `{"packagePolicyIds": ${JSON.stringify(orphanedPackagePolicies)}, "force": true}`,
      3
    );
  }

  //  List of unused packages and versions
  const unusedPackages = installedPackages.saved_objects.filter(
    ({ attributes }) => !packagePoliciesByPackage[attributes.name]
  );
  if (unusedPackages.length > 0) {
    updateReport(``);
    updateReport(`Integrations not in use:`, 2);
    updateReport(
      unusedPackages.map(({ attributes: { name, version } }) => `${name} v${version}`),
      3
    );
  }

  // Finish and report overall status for this check
  updateReport(``);
  updateReport(`Finished checking integrations.`);
  updateStatus(hasProblem ? 'problem' : 'healthy');
};
