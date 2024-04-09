/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { removeLegacyTemplates } from '../../../elasticsearch/template/remove_legacy';

import type { InstallContext } from '../_state_machine_package_install';

export async function stepRemoveLegacyTemplates(context: InstallContext) {
  const { esClient, packageInstallContext, logger } = context;
  const { packageInfo } = packageInstallContext;
  try {
    await removeLegacyTemplates({ packageInfo, esClient, logger });
  } catch (e) {
    logger.warn(`Error removing legacy templates: ${e.message}`);
  }
}
