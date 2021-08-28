/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IRouter } from '../../../../../../src/core/server/http/router/router';
import { PLUGIN_ID } from '../../../common/constants/plugin';
import { PACKAGE_POLICY_API_ROUTES } from '../../../common/constants/routes';
import {
  CreatePackagePolicyRequestSchema,
  DeletePackagePoliciesRequestSchema,
  GetOnePackagePolicyRequestSchema,
  GetPackagePoliciesRequestSchema,
  UpdatePackagePolicyRequestSchema,
  UpgradePackagePoliciesRequestSchema,
} from '../../types/rest_spec/package_policy';

import {
  createPackagePolicyHandler,
  deletePackagePolicyHandler,
  getOnePackagePolicyHandler,
  getPackagePoliciesHandler,
  updatePackagePolicyHandler,
  upgradePackagePolicyHandler,
} from './handlers';

export const registerRoutes = (router: IRouter) => {
  // List
  router.get(
    {
      path: PACKAGE_POLICY_API_ROUTES.LIST_PATTERN,
      validate: GetPackagePoliciesRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-read`] },
    },
    getPackagePoliciesHandler
  );

  // Get one
  router.get(
    {
      path: PACKAGE_POLICY_API_ROUTES.INFO_PATTERN,
      validate: GetOnePackagePolicyRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-read`] },
    },
    getOnePackagePolicyHandler
  );

  // Create
  router.post(
    {
      path: PACKAGE_POLICY_API_ROUTES.CREATE_PATTERN,
      validate: CreatePackagePolicyRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-all`] },
    },
    createPackagePolicyHandler
  );

  // Update
  router.put(
    {
      path: PACKAGE_POLICY_API_ROUTES.UPDATE_PATTERN,
      validate: UpdatePackagePolicyRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-all`] },
    },
    updatePackagePolicyHandler
  );

  // Delete
  router.post(
    {
      path: PACKAGE_POLICY_API_ROUTES.DELETE_PATTERN,
      validate: DeletePackagePoliciesRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}`] },
    },
    deletePackagePolicyHandler
  );

  // Upgrade
  router.post(
    {
      path: PACKAGE_POLICY_API_ROUTES.UPGRADE_PATTERN,
      validate: UpgradePackagePoliciesRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-all`] },
    },
    upgradePackagePolicyHandler
  );
};
