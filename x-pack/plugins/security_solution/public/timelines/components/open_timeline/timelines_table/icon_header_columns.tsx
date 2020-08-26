/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import { EuiIcon, EuiToolTip } from '@elastic/eui';
import React from 'react';

import { ACTION_COLUMN_WIDTH } from './common_styles';
import { getNotesCount, getPinnedEventCount } from '../helpers';
import * as i18n from '../translations';
import { FavoriteTimelineResult, OpenTimelineResult } from '../types';
import { TimelineTypeLiteralWithNull, TimelineType } from '../../../../../common/types/timeline';

/**
 * Returns the columns that have icon headers
 */
export const getIconHeaderColumns = ({
  timelineType,
}: {
  timelineType: TimelineTypeLiteralWithNull;
}) => {
  const columns = {
    note: {
      align: 'center',
      field: 'eventIdToNoteIds',
      name: (
        <EuiToolTip content={i18n.NOTES}>
          <EuiIcon data-test-subj="notes-count-header-icon" size="m" type="editorComment" />
        </EuiToolTip>
      ),
      render: (
        _: Record<string, string[]> | null | undefined,
        timelineResult: OpenTimelineResult
      ) => <span data-test-subj="notes-count">{getNotesCount(timelineResult)}</span>,
      sortable: false,
      width: ACTION_COLUMN_WIDTH,
    },
    pinnedEvent: {
      align: 'center',
      field: 'pinnedEventIds',
      name: (
        <EuiToolTip content={i18n.PINNED_EVENTS}>
          <EuiIcon data-test-subj="pinned-event-header-icon" size="m" type="pin" />
        </EuiToolTip>
      ),
      render: (
        _: Record<string, boolean> | null | undefined,
        timelineResult: OpenTimelineResult
      ) => (
        <span data-test-subj="pinned-event-count">{`${getPinnedEventCount(timelineResult)}`}</span>
      ),
      sortable: false,
      width: ACTION_COLUMN_WIDTH,
    },
    favorite: {
      align: 'center',
      field: 'favorite',
      name: (
        <EuiToolTip content={i18n.FAVORITES}>
          <EuiIcon data-test-subj="favorites-header-icon" size="m" type="starEmpty" />
        </EuiToolTip>
      ),
      render: (favorite: FavoriteTimelineResult[] | null | undefined) => {
        const isFavorite = favorite != null && favorite.length > 0;
        const fill = isFavorite ? 'starFilled' : 'starEmpty';

        return <EuiIcon data-test-subj={`favorite-${fill}-star`} type={fill} size="m" />;
      },
      sortable: false,
      width: ACTION_COLUMN_WIDTH,
    },
  };
  const templateColumns = [columns.note, columns.favorite];
  const defaultColumns = [columns.pinnedEvent, columns.note, columns.favorite];
  return timelineType === TimelineType.template ? templateColumns : defaultColumns;
};
