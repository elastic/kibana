/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const NGAV = i18n.translate(
  'xpack.securitySolution.createPackagePolicy.stepConfigure.endpointDropdownOptionNGAV',
  {
    defaultMessage: 'NGAV',
  }
);

export const EDR_ESSENTIAL = i18n.translate(
  'xpack.securitySolution.createPackagePolicy.stepConfigure.endpointDropdownOptionEDREssential',
  {
    defaultMessage: 'EDR Essential',
  }
);
export const EDR_COMPLETE = i18n.translate(
  'xpack.securitySolution.createPackagePolicy.stepConfigure.endpointDropdownOptionEDRComplete',
  {
    defaultMessage: 'EDR Complete',
  }
);

export const ENDPOINT = i18n.translate(
  'xpack.securitySolution.createPackagePolicy.stepConfigure.endpointDropdownOption',
  {
    defaultMessage: 'Traditional Endpoints (desktops, laptops, virtual machines)',
  }
);
export const CLOUD_SECURITY = i18n.translate(
  'xpack.securitySolution.createPackagePolicy.stepConfigure.cloudDropdownOption',
  {
    defaultMessage: 'Cloud Workloads (Linux servers or Kubernetes environments)',
  }
);
export const INTERACTIVE_ONLY = i18n.translate(
  'xpack.securitySolution.createPackagePolicy.stepConfigure.cloudEventFiltersInteractiveOnly',
  {
    defaultMessage: 'Interactive only',
  }
);
export const ALL_EVENTS = i18n.translate(
  'xpack.securitySolution.createPackagePolicy.stepConfigure.cloudEventFiltersAllEvents',
  {
    defaultMessage: 'All events',
  }
);
export const PREVENT_MALICIOUS_BEHAVIOR = i18n.translate(
  'xpack.securitySolution.createPackagePolicy.stepConfigure.cloudEventFiltersPreventionMaliciousBehavior',
  {
    defaultMessage: 'Prevent Malicious Behavior',
  }
);
