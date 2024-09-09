/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { http, HttpResponse } from 'msw';

const STATUS_URL = `/internal/cloud_security_posture/status`;

export const notInstalledHandler = http.get(STATUS_URL, () => {
  return HttpResponse.json({
    cspm: {
      status: 'not-installed',
      healthyAgents: 1,
      installedPackagePolicies: 1,
    },
    kspm: {
      status: 'not-installed',
      healthyAgents: 1,
      installedPackagePolicies: 1,
    },
    vuln_mgmt: {
      status: 'not-installed',
      healthyAgents: 1,
      installedPackagePolicies: 1,
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
    latestPackageVersion: '1.9.0',
  });
});

export const notInstalledHasMisconfigurationsFindingsHandler = http.get(STATUS_URL, () => {
  return HttpResponse.json({
    hasMisconfigurationsFindings: true,
    cspm: {
      status: 'not-installed',
      healthyAgents: 1,
      installedPackagePolicies: 1,
    },
    kspm: {
      status: 'not-installed',
      healthyAgents: 1,
      installedPackagePolicies: 1,
    },
    vuln_mgmt: {
      status: 'not-installed',
      healthyAgents: 1,
      installedPackagePolicies: 1,
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
    latestPackageVersion: '1.9.0',
  });
});

export const notDeployedHandler = http.get(STATUS_URL, () => {
  return HttpResponse.json({
    cspm: {
      status: 'not-deployed',
      healthyAgents: 1,
      installedPackagePolicies: 1,
    },
    kspm: {
      status: 'not-deployed',
      healthyAgents: 1,
      installedPackagePolicies: 1,
    },
    vuln_mgmt: {
      status: 'not-deployed',
      healthyAgents: 1,
      installedPackagePolicies: 1,
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
    latestPackageVersion: '1.9.0',
    installedPackageVersion: '1.9.0',
  });
});

export const indexingHandler = http.get(STATUS_URL, () => {
  return HttpResponse.json({
    cspm: {
      status: 'indexing',
      healthyAgents: 1,
      installedPackagePolicies: 1,
    },
    kspm: {
      status: 'indexing',
      healthyAgents: 1,
      installedPackagePolicies: 1,
    },
    vuln_mgmt: {
      status: 'indexing',
      healthyAgents: 1,
      installedPackagePolicies: 1,
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
    latestPackageVersion: '1.9.0',
  });
});

export const indexTimeoutHandler = http.get(STATUS_URL, () => {
  return HttpResponse.json({
    cspm: {
      status: 'index-timeout',
      healthyAgents: 1,
      installedPackagePolicies: 1,
    },
    kspm: {
      status: 'index-timeout',
      healthyAgents: 1,
      installedPackagePolicies: 1,
    },
    vuln_mgmt: {
      status: 'index-timeout',
      healthyAgents: 1,
      installedPackagePolicies: 1,
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
    latestPackageVersion: '1.9.0',
  });
});

export const unprivilegedHandler = http.get(STATUS_URL, () => {
  return HttpResponse.json({
    cspm: {
      status: 'unprivileged',
      healthyAgents: 1,
      installedPackagePolicies: 1,
    },
    kspm: {
      status: 'unprivileged',
      healthyAgents: 1,
      installedPackagePolicies: 1,
    },
    vuln_mgmt: {
      status: 'unprivileged',
      healthyAgents: 1,
      installedPackagePolicies: 1,
    },
    indicesDetails: [
      {
        index: 'logs-cloud_security_posture.findings_latest-default',
        status: 'unprivileged',
      },
      {
        index: 'logs-cloud_security_posture.findings-default*',
        status: 'unprivileged',
      },
      {
        index: 'logs-cloud_security_posture.scores-default',
        status: 'unprivileged',
      },
      {
        index: 'logs-cloud_security_posture.vulnerabilities_latest-default',
        status: 'unprivileged',
      },
    ],
    isPluginInitialized: true,
    latestPackageVersion: '1.9.0',
  });
});

export const indexedHandler = http.get(STATUS_URL, () => {
  return HttpResponse.json({
    cspm: {
      status: 'indexed',
      healthyAgents: 1,
      installedPackagePolicies: 1,
    },
    kspm: {
      status: 'indexed',
      healthyAgents: 1,
      installedPackagePolicies: 1,
    },
    vuln_mgmt: {
      status: 'indexed',
      healthyAgents: 1,
      installedPackagePolicies: 1,
    },
    indicesDetails: [
      {
        index: 'logs-cloud_security_posture.findings_latest-default',
        status: 'not-empty',
      },
      {
        index: 'logs-cloud_security_posture.findings-default*',
        status: 'not-empty',
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
    latestPackageVersion: '1.9.0',
    installedPackageVersion: '1.9.0',
  });
});
