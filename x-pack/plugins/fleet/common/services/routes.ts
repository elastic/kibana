/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EPM_API_ROOT,
  EPM_API_ROUTES,
  PACKAGE_POLICY_API_ROUTES,
  AGENT_POLICY_API_ROUTES,
  DATA_STREAM_API_ROUTES,
  AGENTS_SETUP_API_ROUTES,
  AGENT_API_ROUTES,
  ENROLLMENT_API_KEY_ROUTES,
  SETUP_API_ROUTE,
  OUTPUT_API_ROUTES,
  SETTINGS_API_ROUTES,
  APP_API_ROUTES,
  K8S_API_ROUTES,
} from '../constants';

export const epmRouteService = {
  getCategoriesPath: () => {
    return EPM_API_ROUTES.CATEGORIES_PATTERN;
  },

  getListPath: () => {
    return EPM_API_ROUTES.LIST_PATTERN;
  },

  getListLimitedPath: () => {
    return EPM_API_ROUTES.LIMITED_LIST_PATTERN;
  },

  getInfoPath: (pkgName: string, pkgVersion?: string) => {
    if (pkgVersion) {
      return EPM_API_ROUTES.INFO_PATTERN.replace('{pkgName}', pkgName).replace(
        '{pkgVersion}',
        pkgVersion
      );
    } else {
      return EPM_API_ROUTES.INFO_PATTERN.replace('{pkgName}', pkgName).replace('/{pkgVersion}', '');
    }
  },

  getStatsPath: (pkgName: string) => {
    return EPM_API_ROUTES.STATS_PATTERN.replace('{pkgName}', pkgName);
  },

  getFilePath: (filePath: string) => {
    return `${EPM_API_ROOT}${filePath.replace('/package', '/packages')}`;
  },

  getInstallPath: (pkgName: string, pkgVersion: string) => {
    return EPM_API_ROUTES.INSTALL_FROM_REGISTRY_PATTERN.replace('{pkgName}', pkgName)
      .replace('{pkgVersion}', pkgVersion)
      .replace(/\/$/, ''); // trim trailing slash
  },

  getBulkInstallPath: () => {
    return EPM_API_ROUTES.BULK_INSTALL_PATTERN;
  },

  getRemovePath: (pkgName: string, pkgVersion: string) => {
    return EPM_API_ROUTES.DELETE_PATTERN.replace('{pkgName}', pkgName)
      .replace('{pkgVersion}', pkgVersion)
      .replace(/\/$/, ''); // trim trailing slash
  },

  getUpdatePath: (pkgName: string, pkgVersion: string) => {
    return EPM_API_ROUTES.INFO_PATTERN.replace('{pkgName}', pkgName).replace(
      '{pkgVersion}',
      pkgVersion
    );
  },
};

export const packagePolicyRouteService = {
  getListPath: () => {
    return PACKAGE_POLICY_API_ROUTES.LIST_PATTERN;
  },

  getInfoPath: (packagePolicyId: string) => {
    return PACKAGE_POLICY_API_ROUTES.INFO_PATTERN.replace('{packagePolicyId}', packagePolicyId);
  },

  getCreatePath: () => {
    return PACKAGE_POLICY_API_ROUTES.CREATE_PATTERN;
  },

  getUpdatePath: (packagePolicyId: string) => {
    return PACKAGE_POLICY_API_ROUTES.UPDATE_PATTERN.replace('{packagePolicyId}', packagePolicyId);
  },

  getDeletePath: () => {
    return PACKAGE_POLICY_API_ROUTES.DELETE_PATTERN;
  },

  getUpgradePath: () => {
    return PACKAGE_POLICY_API_ROUTES.UPGRADE_PATTERN;
  },

  getDryRunPath: () => {
    return PACKAGE_POLICY_API_ROUTES.DRYRUN_PATTERN;
  },
};

export const agentPolicyRouteService = {
  getListPath: () => {
    return AGENT_POLICY_API_ROUTES.LIST_PATTERN;
  },

  getInfoPath: (agentPolicyId: string) => {
    return AGENT_POLICY_API_ROUTES.INFO_PATTERN.replace('{agentPolicyId}', agentPolicyId);
  },

  getCreatePath: () => {
    return AGENT_POLICY_API_ROUTES.CREATE_PATTERN;
  },

  getUpdatePath: (agentPolicyId: string) => {
    return AGENT_POLICY_API_ROUTES.UPDATE_PATTERN.replace('{agentPolicyId}', agentPolicyId);
  },

  getCopyPath: (agentPolicyId: string) => {
    return AGENT_POLICY_API_ROUTES.COPY_PATTERN.replace('{agentPolicyId}', agentPolicyId);
  },

  getDeletePath: () => {
    return AGENT_POLICY_API_ROUTES.DELETE_PATTERN;
  },

  getInfoFullPath: (agentPolicyId: string) => {
    return AGENT_POLICY_API_ROUTES.FULL_INFO_PATTERN.replace('{agentPolicyId}', agentPolicyId);
  },

  getInfoFullDownloadPath: (agentPolicyId: string) => {
    return AGENT_POLICY_API_ROUTES.FULL_INFO_DOWNLOAD_PATTERN.replace(
      '{agentPolicyId}',
      agentPolicyId
    );
  },

  getK8sInfoPath: () => {
    return K8S_API_ROUTES.K8S_INFO_PATTERN;
  },

  getK8sFullDownloadPath: () => {
    return K8S_API_ROUTES.K8S_DOWNLOAD_PATTERN;
  },
};

export const dataStreamRouteService = {
  getListPath: () => {
    return DATA_STREAM_API_ROUTES.LIST_PATTERN;
  },
};

export const fleetSetupRouteService = {
  getFleetSetupPath: () => AGENTS_SETUP_API_ROUTES.INFO_PATTERN,
  postFleetSetupPath: () => AGENTS_SETUP_API_ROUTES.CREATE_PATTERN,
};

export const agentRouteService = {
  getInfoPath: (agentId: string) => AGENT_API_ROUTES.INFO_PATTERN.replace('{agentId}', agentId),
  getUpdatePath: (agentId: string) => AGENT_API_ROUTES.UPDATE_PATTERN.replace('{agentId}', agentId),
  getUnenrollPath: (agentId: string) =>
    AGENT_API_ROUTES.UNENROLL_PATTERN.replace('{agentId}', agentId),
  getBulkUnenrollPath: () => AGENT_API_ROUTES.BULK_UNENROLL_PATTERN,
  getReassignPath: (agentId: string) =>
    AGENT_API_ROUTES.REASSIGN_PATTERN.replace('{agentId}', agentId),
  getBulkReassignPath: () => AGENT_API_ROUTES.BULK_REASSIGN_PATTERN,
  getUpgradePath: (agentId: string) =>
    AGENT_API_ROUTES.UPGRADE_PATTERN.replace('{agentId}', agentId),
  getBulkUpgradePath: () => AGENT_API_ROUTES.BULK_UPGRADE_PATTERN,
  getListPath: () => AGENT_API_ROUTES.LIST_PATTERN,
  getStatusPath: () => AGENT_API_ROUTES.STATUS_PATTERN,
  getIncomingDataPath: () => AGENT_API_ROUTES.DATA_PATTERN,
  getCreateActionPath: (agentId: string) =>
    AGENT_API_ROUTES.ACTIONS_PATTERN.replace('{agentId}', agentId),
};

export const outputRoutesService = {
  getInfoPath: (outputId: string) => OUTPUT_API_ROUTES.INFO_PATTERN.replace('{outputId}', outputId),
  getUpdatePath: (outputId: string) =>
    OUTPUT_API_ROUTES.UPDATE_PATTERN.replace('{outputId}', outputId),
  getListPath: () => OUTPUT_API_ROUTES.LIST_PATTERN,
  getDeletePath: (outputId: string) =>
    OUTPUT_API_ROUTES.DELETE_PATTERN.replace('{outputId}', outputId),
  getCreatePath: () => OUTPUT_API_ROUTES.CREATE_PATTERN,
  getCreateLogstashApiKeyPath: () => OUTPUT_API_ROUTES.LOGSTASH_API_KEY_PATTERN,
};

export const settingsRoutesService = {
  getInfoPath: () => SETTINGS_API_ROUTES.INFO_PATTERN,
  getUpdatePath: () => SETTINGS_API_ROUTES.UPDATE_PATTERN,
};

export const appRoutesService = {
  getCheckPermissionsPath: (fleetServerSetup?: boolean) => APP_API_ROUTES.CHECK_PERMISSIONS_PATTERN,
  getRegenerateServiceTokenPath: () => APP_API_ROUTES.GENERATE_SERVICE_TOKEN_PATTERN,
};

export const enrollmentAPIKeyRouteService = {
  getListPath: () => ENROLLMENT_API_KEY_ROUTES.LIST_PATTERN,
  getCreatePath: () => ENROLLMENT_API_KEY_ROUTES.CREATE_PATTERN,
  getInfoPath: (keyId: string) => ENROLLMENT_API_KEY_ROUTES.INFO_PATTERN.replace('{keyId}', keyId),
  getDeletePath: (keyId: string) =>
    ENROLLMENT_API_KEY_ROUTES.DELETE_PATTERN.replace('{keyId}', keyId),
};

export const setupRouteService = {
  getSetupPath: () => SETUP_API_ROUTE,
};
