/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import * as React from 'react';

import { ACTION_COLUMN_WIDTH, PositionedIcon } from './common_styles';
import { DeleteTimelines, OnOpenTimeline, OpenTimelineResult } from '../types';
import { DeleteTimelineModalButton } from '../delete_timeline_modal';

import * as i18n from '../translations';

/**
 * Returns the action columns (e.g. delete, open duplicate timeline)
 */
export const getActionsColumns = ({
  onOpenTimeline,
  deleteTimelines,
  showDeleteAction,
}: {
  deleteTimelines?: DeleteTimelines;
  onOpenTimeline: OnOpenTimeline;
  showDeleteAction: boolean;
}) => {
  const deleteTimelineColumn = {
    align: 'center',
    field: 'savedObjectId',
    render: (savedObjectId: string, { title }: OpenTimelineResult) => (
      <PositionedIcon>
        <DeleteTimelineModalButton
          deleteTimelines={deleteTimelines}
          savedObjectId={savedObjectId}
          title={title}
        />
      </PositionedIcon>
    ),
    sortable: false,
    width: ACTION_COLUMN_WIDTH,
  };

  const openAsDuplicateColumn = {
    align: 'center',
    field: 'savedObjectId',
    render: (savedObjectId: string, timelineResult: OpenTimelineResult) => (
      <PositionedIcon>
        <EuiToolTip content={i18n.OPEN_AS_DUPLICATE}>
          <EuiButtonIcon
            aria-label={i18n.OPEN_AS_DUPLICATE}
            color="subdued"
            data-test-subj="open-duplicate"
            isDisabled={savedObjectId == null}
            iconSize="s"
            iconType="copy"
            onClick={() =>
              onOpenTimeline({
                duplicate: true,
                timelineId: `${timelineResult.savedObjectId}`,
              })
            }
            size="s"
          />
        </EuiToolTip>
      </PositionedIcon>
    ),
    sortable: false,
    width: ACTION_COLUMN_WIDTH,
  };

  return showDeleteAction && deleteTimelines != null
    ? [deleteTimelineColumn, openAsDuplicateColumn]
    : [openAsDuplicateColumn];
};
