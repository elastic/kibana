/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const BATCH_ACTIONS = i18n.translate(
  'xpack.securitySolution.notes.management.batchActionsTitle',
  {
    defaultMessage: 'Bulk actions',
  }
);

export const DELETE = i18n.translate('xpack.securitySolution.notes.management.deleteAction', {
  defaultMessage: 'Delete',
});

export const DELETE_NOTES_MODAL_TITLE = i18n.translate(
  'xpack.securitySolution.notes.management.deleteNotesModalTitle',
  {
    defaultMessage: 'Delete notes?',
  }
);

export const DELETE_NOTES_CONFIRM = (selectedNotes: number) =>
  i18n.translate('xpack.securitySolution.notes.management.deleteNotesConfirm', {
    values: { selectedNotes },
    defaultMessage:
      'Are you sure you want to delete {selectedNotes} {selectedNotes, plural, one {note} other {notes}}?',
  });

export const DELETE_NOTES_CANCEL = i18n.translate(
  'xpack.securitySolution.notes.management.deleteNotesCancel',
  {
    defaultMessage: 'Cancel',
  }
);

export const DELETE_SELECTED = i18n.translate(
  'xpack.securitySolution.notes.management.deleteSelected',
  {
    defaultMessage: 'Delete selected notes',
  }
);

export const REFRESH = i18n.translate('xpack.securitySolution.notes.management.refresh', {
  defaultMessage: 'Refresh',
});

export const VIEW_EVENT_IN_TIMELINE = i18n.translate(
  'xpack.securitySolution.notes.management.viewEventInTimeline',
  {
    defaultMessage: 'View event in timeline',
  }
);
