/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const ALL_ACTIONS = i18n.translate('xpack.siem.open.timeline.allActionsTooltip', {
  defaultMessage: 'All actions',
});

export const BATCH_ACTIONS = i18n.translate('xpack.siem.open.timeline.batchActionsTitle', {
  defaultMessage: 'Bulk actions',
});

export const CANCEL = i18n.translate('xpack.siem.open.timeline.cancelButton', {
  defaultMessage: 'Cancel',
});

export const COLLAPSE = i18n.translate('xpack.siem.open.timeline.collapseButton', {
  defaultMessage: 'Collapse',
});

export const DELETE = i18n.translate('xpack.siem.open.timeline.deleteButton', {
  defaultMessage: 'Delete',
});

export const DELETE_SELECTED = i18n.translate('xpack.siem.open.timeline.deleteSelectedButton', {
  defaultMessage: 'Delete selected',
});

export const DELETE_WARNING = i18n.translate('xpack.siem.open.timeline.deleteWarningLabel', {
  defaultMessage: 'You will not be able to recover this timeline or its notes once deleted.',
});

export const DESCRIPTION = i18n.translate('xpack.siem.open.timeline.descriptionTableHeader', {
  defaultMessage: 'Description',
});

export const EXPAND = i18n.translate('xpack.siem.open.timeline.expandButton', {
  defaultMessage: 'Expand',
});

export const EXPORT_FILENAME = i18n.translate('xpack.siem.open.timeline.exportFileNameTitle', {
  defaultMessage: 'timelines_export',
});

export const EXPORT_SELECTED = i18n.translate('xpack.siem.open.timeline.exportSelectedButton', {
  defaultMessage: 'Export selected',
});

export const FAVORITE_SELECTED = i18n.translate('xpack.siem.open.timeline.favoriteSelectedButton', {
  defaultMessage: 'Favorite selected',
});

export const FAVORITES = i18n.translate('xpack.siem.open.timeline.favoritesTooltip', {
  defaultMessage: 'Favorites',
});

export const LAST_MODIFIED = i18n.translate('xpack.siem.open.timeline.lastModifiedTableHeader', {
  defaultMessage: 'Last modified',
});

export const MISSING_SAVED_OBJECT_ID = i18n.translate(
  'xpack.siem.open.timeline.missingSavedObjectIdTooltip',
  {
    defaultMessage: 'Missing savedObjectId',
  }
);

export const MODIFIED_BY = i18n.translate('xpack.siem.open.timeline.modifiedByTableHeader', {
  defaultMessage: 'Modified by',
});

export const NOTES = i18n.translate('xpack.siem.open.timeline.notesTooltip', {
  defaultMessage: 'Notes',
});

export const ONLY_FAVORITES = i18n.translate('xpack.siem.open.timeline.onlyFavoritesButtonLabel', {
  defaultMessage: 'Only favorites',
});

export const OPEN_AS_DUPLICATE = i18n.translate('xpack.siem.open.timeline.openAsDuplicateTooltip', {
  defaultMessage: 'Duplicate timeline',
});

export const OPEN_TIMELINE = i18n.translate('xpack.siem.open.timeline.openTimelineButton', {
  defaultMessage: 'Open Timeline…',
});

export const OPEN_TIMELINE_TITLE = i18n.translate('xpack.siem.open.timeline.openTimelineTitle', {
  defaultMessage: 'Open Timeline',
});

export const PINNED_EVENTS = i18n.translate('xpack.siem.open.timeline.pinnedEventsTooltip', {
  defaultMessage: 'Pinned events',
});

export const POSTED = i18n.translate('xpack.siem.open.timeline.postedLabel', {
  defaultMessage: 'Posted:',
});

export const REFRESH = i18n.translate('xpack.siem.open.timeline.refreshTitle', {
  defaultMessage: 'Refresh',
});

export const SEARCH_PLACEHOLDER = i18n.translate('xpack.siem.open.timeline.searchPlaceholder', {
  defaultMessage: 'e.g. timeline name, or description',
});

export const TIMELINE_NAME = i18n.translate('xpack.siem.open.timeline.timelineNameTableHeader', {
  defaultMessage: 'Timeline name',
});

export const UNTITLED_TIMELINE = i18n.translate('xpack.siem.open.timeline.untitledTimelineLabel', {
  defaultMessage: 'Untitled timeline',
});

export const WITH = i18n.translate('xpack.siem.open.timeline.withLabel', {
  defaultMessage: 'with',
});

export const ZERO_TIMELINES_MATCH = i18n.translate(
  'xpack.siem.open.timeline.zeroTimelinesMatchLabel',
  {
    defaultMessage: '0 timelines match the search criteria',
  }
);

export const SELECTED_TIMELINES = (selectedTimelines: number) =>
  i18n.translate('xpack.siem.open.timeline.selectedTimelinesTitle', {
    values: { selectedTimelines },
    defaultMessage:
      'Selected {selectedTimelines} {selectedTimelines, plural, =1 {timeline} other {timelines}}',
  });

export const SHOWING = i18n.translate('xpack.siem.open.timeline.showingLabel', {
  defaultMessage: 'Showing:',
});

export const SUCCESSFULLY_EXPORTED_TIMELINES = (totalTimelines: number) =>
  i18n.translate('xpack.siem.open.timeline.successfullyExportedTimelinesTitle', {
    values: { totalTimelines },
    defaultMessage:
      'Successfully exported {totalTimelines, plural, =0 {all timelines} =1 {{totalTimelines} timeline} other {{totalTimelines} timelines}}',
  });

export const IMPORT_TIMELINE_BTN_TITLE = i18n.translate(
  'xpack.siem.timelines.components.importTimelineModal.importTimelineTitle',
  {
    defaultMessage: 'Import timeline',
  }
);

export const SELECT_TIMELINE = i18n.translate(
  'xpack.siem.timelines.components.importTimelineModal.selectTimelineDescription',
  {
    defaultMessage: 'Select a SIEM timeline (as exported from the Timeline view) to import',
  }
);

export const INITIAL_PROMPT_TEXT = i18n.translate(
  'xpack.siem.timelines.components.importTimelineModal.initialPromptTextDescription',
  {
    defaultMessage: 'Select or drag and drop a valid timelines_export.ndjson file',
  }
);

export const OVERWRITE_WITH_SAME_NAME = i18n.translate(
  'xpack.siem.timelines.components.importTimelineModal.overwriteDescription',
  {
    defaultMessage: 'Automatically overwrite saved objects with the same timeline ID',
  }
);

export const SUCCESSFULLY_IMPORTED_TIMELINES = (totalCount: number) =>
  i18n.translate(
    'xpack.siem.timelines.components.importTimelineModal.successfullyImportedTimelinesTitle',
    {
      values: { totalCount },
      defaultMessage:
        'Successfully imported {totalCount} {totalCount, plural, =1 {timeline} other {timelines}}',
    }
  );

export const IMPORT_FAILED = i18n.translate(
  'xpack.siem.timelines.components.importTimelineModal.importFailedTitle',
  {
    defaultMessage: 'Failed to import timelines',
  }
);

export const IMPORT_TIMELINE = i18n.translate(
  'xpack.siem.timelines.components.importTimelineModal.importTitle',
  {
    defaultMessage: 'Import timeline…',
  }
);

export const IMPORT_FAILED_DETAILED = (id: string, statusCode: number, message: string) =>
  i18n.translate('xpack.siem.timelines.components.importTimelineModal.importFailedDetailedTitle', {
    values: { id, statusCode, message },
    defaultMessage: 'Timeline ID: {id}\n Status Code: {statusCode}\n Message: {message}',
  });
