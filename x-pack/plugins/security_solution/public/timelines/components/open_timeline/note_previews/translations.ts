/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const TOGGLE_EXPAND_EVENT_DETAILS = i18n.translate(
  'xpack.securitySolution.timeline.toggleEventDetailsTitle',
  {
    defaultMessage: 'Expand event details',
  }
);

export const USER_ADDED_A_NOTE = (user: string) =>
  i18n.translate('xpack.securitySolution.timeline.userAddedANoteScreenReaderOnly', {
    values: { user },
    defaultMessage: '{user} added a note',
  });

export const AN_UNKNOWN_USER = i18n.translate(
  'xpack.securitySolution.timeline.anUnknownUserScreenReaderOnly',
  {
    defaultMessage: 'an unknown user',
  }
);
