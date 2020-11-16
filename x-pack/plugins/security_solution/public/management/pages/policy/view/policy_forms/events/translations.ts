/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const EVENTS_HEADING = i18n.translate(
  'xpack.securitySolution.endpoint.policyDetailsConfig.eventingEvents',
  {
    defaultMessage: 'Events',
  }
);

export const EVENTS_FORM_TYPE_LABEL = i18n.translate(
  'xpack.securitySolution.endpoint.policy.details.eventCollection',
  {
    defaultMessage: 'Event Collection',
  }
);

export const COLLECTIONS_ENABLED_MESSAGE = (selected: number, total: number) => {
  return i18n.translate('xpack.securitySolution.endpoint.policy.details.eventCollectionsEnabled', {
    defaultMessage: '{selected} / {total} event collections enabled',
    values: { selected, total },
  });
};
