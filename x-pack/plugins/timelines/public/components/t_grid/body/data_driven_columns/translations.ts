/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const YOU_ARE_IN_A_TABLE_CELL = ({ column, row }: { column: number; row: number }) =>
  i18n.translate('xpack.timelines.timeline.youAreInATableCellScreenReaderOnly', {
    values: { column, row },
    defaultMessage: 'You are in a table cell. row: {row}, column: {column}',
  });

export const EVENT_HAS_AN_EVENT_RENDERER = (row: number) =>
  i18n.translate('xpack.timelines.timeline.eventHasEventRendererScreenReaderOnly', {
    values: { row },
    defaultMessage:
      'The event in row {row} has an event renderer. Press shift + down arrow to focus it.',
  });

export const EVENT_HAS_NOTES = ({ notesCount, row }: { notesCount: number; row: number }) =>
  i18n.translate('xpack.timelines.timeline.eventHasNotesScreenReaderOnly', {
    values: { notesCount, row },
    defaultMessage:
      'The event in row {row} has {notesCount, plural, =1 {a note} other {{notesCount} notes}}. Press shift + right arrow to focus notes.',
  });
