/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ReportingCore } from '../../..';
import { INTERNAL_ROUTES } from '../../../../common/constants';
import { authorizedUserPreRouting, RequestHandler } from '../../lib';

export function registerGeneration(reporting: ReportingCore, logger: Logger) {
  const setupDeps = reporting.getPluginSetupDeps();
  const { router } = setupDeps;

  // TODO: find a way to abstract this using ExportTypeRegistry: it needs a new
  // public method to return this array
  // const registry = reporting.getExportTypesRegistry();
  // const kibanaAccessControlTags = registry.getAllAccessControlTags();
  const useKibanaAccessControl = reporting.getDeprecatedAllowedRoles() === false; // true if Reporting's deprecated access control feature is disabled
  const kibanaAccessControlTags = useKibanaAccessControl ? ['access:generateReport'] : [];

  const path = `${INTERNAL_ROUTES.GENERATE.EXPORT_TYPE_PREFIX}/{exportType}`;
  router.post(
    {
      path,
      validate: RequestHandler.getValidation(),
      options: { tags: kibanaAccessControlTags },
    },
    authorizedUserPreRouting(reporting, async (user, context, req, res) => {
      const requestHandler = new RequestHandler(reporting, user, context, req, res, logger);
      return await requestHandler.handleGenerateRequest(path, req.params.exportType);
    })
  );
}
