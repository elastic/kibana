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

export const CREATED_COLUMN = i18n.translate(
  'xpack.securitySolution.notes.management.createdColumnTitle',
  {
    defaultMessage: 'Created',
  }
);

export const CREATED_BY_COLUMN = i18n.translate(
  'xpack.securitySolution.notes.management.createdByColumnTitle',
  {
    defaultMessage: 'Created by',
  }
);

export const EVENT_ID_COLUMN = i18n.translate(
  'xpack.securitySolution.notes.management.eventIdColumnTitle',
  {
    defaultMessage: 'View Document',
  }
);

export const TIMELINE_ID_COLUMN = i18n.translate(
  'xpack.securitySolution.notes.management.timelineColumnTitle',
  {
    defaultMessage: 'Timeline',
  }
);

export const NOTE_CONTENT_COLUMN = i18n.translate(
  'xpack.securitySolution.notes.management.noteContentColumnTitle',
  {
    defaultMessage: 'Note content',
  }
);

export const DELETE = i18n.translate('xpack.securitySolution.notes.management.deleteAction', {
  defaultMessage: 'Delete',
});

export const DELETE_SINGLE_NOTE_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.notes.management.deleteDescription',
  {
    defaultMessage: 'Delete this note',
  }
);

export const NOTES_MANAGEMENT_TITLE = i18n.translate(
  'xpack.securitySolution.notes.management.pageTitle',
  {
    defaultMessage: 'Notes management',
  }
);

export const TABLE_ERROR = i18n.translate('xpack.securitySolution.notes.management.tableError', {
  defaultMessage: 'Unable to load notes',
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

export const OPEN_TIMELINE = i18n.translate(
  'xpack.securitySolution.notes.management.openTimeline',
  {
    defaultMessage: 'Open timeline',
  }
);

export const VIEW_EVENT_IN_TIMELINE = i18n.translate(
  'xpack.securitySolution.notes.management.viewEventInTimeline',
  {
    defaultMessage: 'View event in timeline',
  }
);
