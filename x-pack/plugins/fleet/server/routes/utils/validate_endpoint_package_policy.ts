/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import Boom from '@hapi/boom';

import type { NewPackagePolicyInput } from '../../../common';

export const validateEndpointPackagePolicy = (input: NewPackagePolicyInput) => {
  if (input.type !== 'endpoint') {
    return;
  }
  if (input.config?.policy?.value?.global_manifest_version) {
    const globalManifestVersion = input.config.policy.value.global_manifest_version;

    if (globalManifestVersion !== 'latest') {
      const parsedDate = moment(globalManifestVersion, 'YYYY-MM-DD', true);
      if (!parsedDate.isValid()) {
        throw Boom.badRequest('Invalid date format. Use "latest" or "YYYY-MM-DD" format.');
      }

      const maxAllowedDate = moment().subtract(18, 'months');
      if (parsedDate.isBefore(maxAllowedDate)) {
        throw Boom.badRequest(
          'Global manifest version is too far in the past. Use "latest" or a date within the last 18 months.'
        );
      }
      if (parsedDate.isAfter(moment())) {
        throw Boom.badRequest('Global manifest version cannot be in the future.');
      }
    }
  }
};
