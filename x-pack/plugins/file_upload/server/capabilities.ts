/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup } from '@kbn/core/server';
import { checkFileUploadPrivileges } from './check_privileges';
import { StartDeps } from './types';

export const setupCapabilities = (
  core: Pick<CoreSetup<StartDeps>, 'capabilities' | 'getStartServices'>
) => {
  core.capabilities.registerProvider(() => {
    return {
      fileUpload: {
        show: true,
      },
    };
  });

  core.capabilities.registerSwitcher(async (request, capabilities, useDefaultCapabilities) => {
    if (useDefaultCapabilities) {
      return capabilities;
    }
    const [, { security }] = await core.getStartServices();

    // Check the bare minimum set of privileges required to get some utility out of this feature
    const { hasImportPermission } = await checkFileUploadPrivileges({
      authorization: security?.authz,
      request,
      checkCreateDataView: true,
      checkHasManagePipeline: false,
    });

    if (!hasImportPermission) {
      return {
        fileUpload: {
          show: false,
        },
      };
    }

    return capabilities;
  });
};
