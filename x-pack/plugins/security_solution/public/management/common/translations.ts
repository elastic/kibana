/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { OperatingSystem } from '@kbn/securitysolution-utils';
import { ServerApiError } from '../../common/types';

export const ENDPOINTS_TAB = i18n.translate('xpack.securitySolution.endpointsTab', {
  defaultMessage: 'Endpoints',
});

export const POLICIES_TAB = i18n.translate('xpack.securitySolution.policiesTab', {
  defaultMessage: 'Policies',
});

export const TRUSTED_APPS_TAB = i18n.translate('xpack.securitySolution.trustedAppsTab', {
  defaultMessage: 'Trusted applications',
});

export const EVENT_FILTERS_TAB = i18n.translate('xpack.securitySolution.eventFiltersTab', {
  defaultMessage: 'Event filters',
});

export const BETA_BADGE_LABEL = i18n.translate('xpack.securitySolution.administration.list.beta', {
  defaultMessage: 'Beta',
});

export const OS_TITLES: Readonly<{ [K in OperatingSystem]: string }> = {
  [OperatingSystem.WINDOWS]: i18n.translate('xpack.securitySolution.administration.os.windows', {
    defaultMessage: 'Windows',
  }),
  [OperatingSystem.MAC]: i18n.translate('xpack.securitySolution.administration.os.macos', {
    defaultMessage: 'Mac',
  }),
  [OperatingSystem.LINUX]: i18n.translate('xpack.securitySolution.administration.os.linux', {
    defaultMessage: 'Linux',
  }),
};

export const getLoadPoliciesError = (error: ServerApiError) => {
  return i18n.translate('xpack.securitySolution.exceptions.failedLoadPolicies', {
    defaultMessage: 'There was an error loading policies: "{error}"',
    values: { error: error.message },
  });
};
