/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { noop } from 'lodash/fp';
import React, { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';

import { timelineActions } from '../../../../../store/timeline';
import { ColumnHeaderOptions } from '../../../../../../timelines/store/timeline/model';
import { OnFilterChange } from '../../../events';
import { Sort } from '../../sort';
import { Actions } from '../actions';
import { Filter } from '../filter';
import { getNewSortDirectionOnClick } from './helpers';
import { HeaderContent } from './header_content';
import { useManageTimeline } from '../../../../manage_timeline';

interface Props {
  header: ColumnHeaderOptions;
  onFilterChange?: OnFilterChange;
  sort: Sort[];
  timelineId: string;
}

export const HeaderComponent: React.FC<Props> = ({
  header,
  onFilterChange = noop,
  sort,
  timelineId,
}) => {
  const dispatch = useDispatch();

  const onColumnSort = useCallback(() => {
    const columnId = header.id;
    const sortDirection = getNewSortDirectionOnClick({
      clickedHeader: header,
      currentSort: sort,
    });
    const headerIndex = sort.findIndex((col) => col.columnId === columnId);
    let newSort = [];
    if (headerIndex === -1) {
      newSort = [
        ...sort,
        {
          columnId,
          sortDirection,
        },
      ];
    } else {
      newSort = [
        ...sort.slice(0, headerIndex),
        {
          columnId,
          sortDirection,
        },
        ...sort.slice(headerIndex + 1),
      ];
    }
    dispatch(
      timelineActions.updateSort({
        id: timelineId,
        sort: newSort,
      })
    );
  }, [dispatch, header, sort, timelineId]);

  const onColumnRemoved = useCallback(
    (columnId) => dispatch(timelineActions.removeColumn({ id: timelineId, columnId })),
    [dispatch, timelineId]
  );

  const { getManageTimelineById } = useManageTimeline();

  const isLoading = useMemo(() => getManageTimelineById(timelineId).isLoading, [
    getManageTimelineById,
    timelineId,
  ]);

  return (
    <>
      <HeaderContent
        header={header}
        isLoading={isLoading}
        isResizing={false}
        onClick={onColumnSort}
        sort={sort}
      >
        <Actions
          header={header}
          isLoading={isLoading}
          onColumnRemoved={onColumnRemoved}
          sort={sort}
        />
      </HeaderContent>

      <Filter header={header} onFilterChange={onFilterChange} />
    </>
  );
};

export const Header = React.memo(HeaderComponent);
