/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SOLUTION_NAME = i18n.translate('xpack.securitySolution.pages.common.solutionName', {
  defaultMessage: 'Security',
});

export const EMPTY_ACTION_ELASTIC_AGENT = i18n.translate(
  'xpack.securitySolution.pages.common.emptyActionElasticAgent',
  {
    defaultMessage: 'Add data with Elastic Agent',
  }
);

export const EMPTY_ACTION_ELASTIC_AGENT_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.pages.common.emptyActionElasticAgentDescription',
  {
    defaultMessage:
      'The Elastic Agent provides a simple, unified way to add monitoring to your hosts.',
  }
);

export const EMPTY_ACTION_BEATS = i18n.translate(
  'xpack.securitySolution.pages.common.emptyActionBeats',
  {
    defaultMessage: 'Add data with Beats',
  }
);

export const EMPTY_ACTION_BEATS_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.pages.common.emptyActionBeatsDescription',
  {
    defaultMessage:
      'Lightweight Beats can send data from hundreds or thousands of machines and systems',
  }
);

export const EMPTY_ACTION_SECONDARY = i18n.translate(
  'xpack.securitySolution.pages.common.emptyActionSecondary',
  {
    defaultMessage: 'getting started guide.',
  }
);

export const EMPTY_ACTION_ENDPOINT = i18n.translate(
  'xpack.securitySolution.pages.common.emptyActionEndpoint',
  {
    defaultMessage: 'Add Endpoint Security',
  }
);

export const EMPTY_ACTION_ENDPOINT_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.pages.common.emptyActionEndpointDescription',
  {
    defaultMessage:
      'Protect your hosts with threat prevention, detection, and deep security data visibility.',
  }
);

export const BETA = i18n.translate('xpack.securitySolution.pages.common.beta', {
  defaultMessage: 'Beta',
});

export const UPDATE_ALERT_STATUS_FAILED = (conflicts: number) =>
  i18n.translate('xpack.securitySolution.pages.common.updateAlertStatusFailed', {
    values: { conflicts },
    defaultMessage:
      'Failed to update { conflicts } {conflicts, plural, =1 {alert} other {alerts}}.',
  });

export const UPDATE_ALERT_STATUS_FAILED_DETAILED = (updated: number, conflicts: number) =>
  i18n.translate('xpack.securitySolution.pages.common.updateAlertStatusFailedDetailed', {
    values: { updated, conflicts },
    defaultMessage: `{ updated } {updated, plural, =1 {alert was} other {alerts were}} updated successfully, but { conflicts } failed to update
         because { conflicts, plural, =1 {it was} other {they were}} already being modified.`,
  });
