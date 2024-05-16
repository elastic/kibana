/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { http, HttpResponse } from 'msw';

export const defaultStatusInstalled = http.get(
  'http://localhost/internal/cloud_security_posture/status',
  () => {
    return HttpResponse.json({
      cspm: {
        status: 'installed',
        healthyAgents: 0,
        installedPackagePolicies: 1,
      },
      kspm: {
        status: 'installed',
        healthyAgents: 0,
        installedPackagePolicies: 0,
      },
      vuln_mgmt: {
        status: 'installed',
        healthyAgents: 0,
        installedPackagePolicies: 0,
      },
      indicesDetails: [
        {
          index: 'logs-cloud_security_posture.findings_latest-default',
          status: 'success',
        },
        {
          index: 'logs-cloud_security_posture.findings-default*',
          status: 'success',
        },
        {
          index: 'logs-cloud_security_posture.scores-default',
          status: 'succeess',
        },
        {
          index: 'logs-cloud_security_posture.vulnerabilities_latest-default',
          status: 'success',
        },
      ],
      isPluginInitialized: true,
      latestPackageVersion: '1.8.1',
      installedPackageVersion: '1.8.1',
    });
  }
);

export const cspmStatusNotInstalled = http.get(
  'http://localhost/internal/cloud_security_posture/status',
  () => {
    return HttpResponse.json({
      cspm: {
        status: 'not-installed',
        healthyAgents: 0,
        installedPackagePolicies: 0,
      },
      kspm: {
        status: 'not-installed',
        healthyAgents: 0,
        installedPackagePolicies: 0,
      },
      vuln_mgmt: {
        status: 'not-installed',
        healthyAgents: 0,
        installedPackagePolicies: 0,
      },
      indicesDetails: [
        {
          index: 'logs-cloud_security_posture.findings_latest-default',
          status: 'empty',
        },
        {
          index: 'logs-cloud_security_posture.findings-default*',
          status: 'empty',
        },
        {
          index: 'logs-cloud_security_posture.scores-default',
          status: 'not-empty',
        },
        {
          index: 'logs-cloud_security_posture.vulnerabilities_latest-default',
          status: 'empty',
        },
      ],
      isPluginInitialized: true,
      latestPackageVersion: '1.8.1',
    });
  }
);

export const cspmStatusCspmNotDeployed = http.get(
  'http://localhost/internal/cloud_security_posture/status',
  (info) => {
    return HttpResponse.json({
      cspm: {
        status: 'not-deployed',
        healthyAgents: 0,
        installedPackagePolicies: 1,
      },
      kspm: {
        status: 'not-deployed',
        healthyAgents: 0,
        installedPackagePolicies: 0,
      },
      vuln_mgmt: {
        status: 'not-deployed',
        healthyAgents: 0,
        installedPackagePolicies: 0,
      },
      indicesDetails: [
        {
          index: 'logs-cloud_security_posture.findings_latest-default',
          status: 'empty',
        },
        {
          index: 'logs-cloud_security_posture.findings-default*',
          status: 'empty',
        },
        {
          index: 'logs-cloud_security_posture.scores-default',
          status: 'not-empty',
        },
        {
          index: 'logs-cloud_security_posture.vulnerabilities_latest-default',
          status: 'empty',
        },
      ],
      isPluginInitialized: true,
      latestPackageVersion: '1.8.1',
      installedPackageVersion: '1.8.1',
    });
  }
);

export const cspmStatusIndexing = http.get(
  'http://localhost/internal/cloud_security_posture/status',
  () => {
    return HttpResponse.json({
      cspm: {
        status: 'indexing',
        healthyAgents: 0,
        installedPackagePolicies: 0,
      },
      kspm: {
        status: 'indexing',
        healthyAgents: 0,
        installedPackagePolicies: 0,
      },
      vuln_mgmt: {
        status: 'indexing',
        healthyAgents: 0,
        installedPackagePolicies: 0,
      },
      indicesDetails: [
        {
          index: 'logs-cloud_security_posture.findings_latest-default',
          status: 'empty',
        },
        {
          index: 'logs-cloud_security_posture.findings-default*',
          status: 'not-empty',
        },
        {
          index: 'logs-cloud_security_posture.scores-default',
          status: 'empty',
        },
        {
          index: 'logs-cloud_security_posture.vulnerabilities_latest-default',
          status: 'empty',
        },
      ],
      isPluginInitialized: true,
      latestPackageVersion: '1.8.1',
    });
  }
);

export const cspmStatusIndexingTimeout = http.get(
  'http://localhost/internal/cloud_security_posture/status',
  () => {
    return HttpResponse.json({
      cspm: {
        status: 'index-timeout',
        healthyAgents: 0,
        installedPackagePolicies: 0,
      },
      kspm: {
        status: 'index-timeout',
        healthyAgents: 0,
        installedPackagePolicies: 0,
      },
      vuln_mgmt: {
        status: 'index-timeout',
        healthyAgents: 0,
        installedPackagePolicies: 0,
      },
      indicesDetails: [
        {
          index: 'logs-cloud_security_posture.findings_latest-default',
          status: 'empty',
        },
        {
          index: 'logs-cloud_security_posture.findings-default*',
          status: 'empty',
        },
        {
          index: 'logs-cloud_security_posture.scores-default',
          status: 'empty',
        },
        {
          index: 'logs-cloud_security_posture.vulnerabilities_latest-default',
          status: 'empty',
        },
      ],
      isPluginInitialized: true,
      latestPackageVersion: '1.8.1',
    });
  }
);
export const cspmStatusUnprivileged = http.get(
  'http://localhost/internal/cloud_security_posture/status',
  () => {
    return HttpResponse.json({
      cspm: {
        status: 'unprivileged',
        healthyAgents: 0,
        installedPackagePolicies: 0,
      },
      kspm: {
        status: 'unprivileged',
        healthyAgents: 0,
        installedPackagePolicies: 0,
      },
      vuln_mgmt: {
        status: 'unprivileged',
        healthyAgents: 0,
        installedPackagePolicies: 0,
      },
      indicesDetails: [
        {
          index: 'logs-cloud_security_posture.findings_latest-default',
          status: 'success',
        },
        {
          index: 'logs-cloud_security_posture.findings-default*',
          status: 'success',
        },
        {
          index: 'logs-cloud_security_posture.scores-default',
          status: 'success',
        },
        {
          index: 'logs-cloud_security_posture.vulnerabilities_latest-default',
          status: 'unprivileged',
        },
      ],
      isPluginInitialized: true,
      latestPackageVersion: '1.8.1',
    });
  }
);

export const cspmStatusIndexed = http.get(
  'http://localhost/internal/cloud_security_posture/status',
  () => {
    return HttpResponse.json({
      cspm: {
        status: 'indexed',
        healthyAgents: 0,
        installedPackagePolicies: 1,
      },
      kspm: {
        status: 'indexed',
        healthyAgents: 0,
        installedPackagePolicies: 0,
      },
      vuln_mgmt: {
        status: 'indexed',
        healthyAgents: 0,
        installedPackagePolicies: 0,
      },
      indicesDetails: [
        {
          index: 'logs-cloud_security_posture.findings_latest-default',
          status: 'not-empty',
        },
        {
          index: 'logs-cloud_security_posture.findings-default*',
          status: 'empty',
        },
        {
          index: 'logs-cloud_security_posture.scores-default',
          status: 'not-empty',
        },
        {
          index: 'logs-cloud_security_posture.vulnerabilities_latest-default',
          status: 'not-empty',
        },
      ],
      isPluginInitialized: true,
      latestPackageVersion: '1.8.1',
      installedPackageVersion: '1.8.1',
    });
  }
);
