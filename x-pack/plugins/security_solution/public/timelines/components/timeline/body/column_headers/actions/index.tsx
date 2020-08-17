/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonIcon } from '@elastic/eui';
import React from 'react';

import { ColumnHeaderOptions } from '../../../../../../timelines/store/timeline/model';
import { OnColumnRemoved } from '../../../events';
import { EventsHeadingExtra, EventsLoading } from '../../../styles';
import { Sort } from '../../sort';

import * as i18n from '../translations';

interface Props {
  header: ColumnHeaderOptions;
  isLoading: boolean;
  onColumnRemoved: OnColumnRemoved;
  sort: Sort;
}

/** Given a `header`, returns the `SortDirection` applicable to it */

export const CloseButton = React.memo<{
  columnId: string;
  onColumnRemoved: OnColumnRemoved;
}>(({ columnId, onColumnRemoved }) => (
  <EuiButtonIcon
    aria-label={i18n.REMOVE_COLUMN}
    color="text"
    data-test-subj="remove-column"
    iconType="cross"
    onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
      // To avoid a re-sorting when you delete a column
      event.preventDefault();
      event.stopPropagation();
      onColumnRemoved(columnId);
    }}
  />
));

CloseButton.displayName = 'CloseButton';

export const Actions = React.memo<Props>(({ header, onColumnRemoved, sort, isLoading }) => {
  return (
    <>
      {sort.columnId === header.id && isLoading ? (
        <EventsHeadingExtra className="siemEventsHeading__extra--loading">
          <EventsLoading data-test-subj="timeline-loading-spinner" />
        </EventsHeadingExtra>
      ) : (
        <EventsHeadingExtra className="siemEventsHeading__extra--close">
          <CloseButton columnId={header.id} onColumnRemoved={onColumnRemoved} />
        </EventsHeadingExtra>
      )}
    </>
  );
});

Actions.displayName = 'Actions';
