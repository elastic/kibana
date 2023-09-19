/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const TOGGLE_EXPAND_EVENT_DETAILS = i18n.translate(
  'xpack.securitySolution.timeline.toggleEventDetailsTitle',
  {
    defaultMessage: 'Expand event details',
  }
);

export const ADDED_A_NOTE = i18n.translate('xpack.securitySolution.timeline.addedANoteLabel', {
  defaultMessage: 'added a note',
});

export const ADDED_A_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.timeline.addedADescriptionLabel',
  {
    defaultMessage: 'added description',
  }
);

export const AN_UNKNOWN_USER = i18n.translate(
  'xpack.securitySolution.timeline.anUnknownUserLabel',
  {
    defaultMessage: 'an unknown user',
  }
);

export const DELETE_NOTE_ERROR = (error: string) =>
  i18n.translate('xpack.securitySolution.timeline.deleteNoteError', {
    defaultMessage: 'An error occurred deleting note {error}',
    values: { error },
  });

export const DELETE_NOTE = i18n.translate('xpack.securitySolution.timeline.deleteNoteLabel', {
  defaultMessage: 'Delete Note',
});

export const CANCEL_DELETE_NOTE = i18n.translate(
  'xpack.securitySolution.timeline.cancelDeleteNoteLabel',
  {
    defaultMessage: 'Keep Note',
  }
);

export const DELETE_NOTE_CONFIRM = i18n.translate(
  'xpack.securitySolution.timeline.promptDeleteNoteLabel',
  {
    defaultMessage: 'Delete timeline note?',
  }
);
