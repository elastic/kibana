/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { isDataViewFieldSubtypeNested } from '@kbn/es-query';

import type { ColumnHeaderOptions } from '../../../../../../common/types/timeline';
import type { Sort } from '../../sort';
import { Actions } from '../actions';
import { getNewSortDirectionOnClick } from './helpers';
import { HeaderContent } from './header_content';
import { tGridActions, tGridSelectors } from '../../../../../store/t_grid';
import { useDeepEqualSelector } from '../../../../../hooks/use_selector';
interface Props {
  header: ColumnHeaderOptions;
  sort: Sort[];
  timelineId: string;
}

export const HeaderComponent: React.FC<Props> = ({ header, sort, timelineId }) => {
  const dispatch = useDispatch();

  const onColumnSort = useCallback(() => {
    const columnId = header.id;
    const columnType = header.type ?? 'text';
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
          columnType,
          sortDirection,
        },
      ];
    } else {
      newSort = [
        ...sort.slice(0, headerIndex),
        {
          columnId,
          columnType,
          sortDirection,
        },
        ...sort.slice(headerIndex + 1),
      ];
    }
    dispatch(
      tGridActions.updateSort({
        id: timelineId,
        sort: newSort,
      })
    );
  }, [dispatch, header, sort, timelineId]);

  const onColumnRemoved = useCallback(
    (columnId) => dispatch(tGridActions.removeColumn({ id: timelineId, columnId })),
    [dispatch, timelineId]
  );

  const getManageTimeline = useMemo(() => tGridSelectors.getManageTimelineById(), []);
  const { isLoading } = useDeepEqualSelector((state) => getManageTimeline(state, timelineId ?? ''));
  const showSortingCapability = !isDataViewFieldSubtypeNested(header);

  return (
    <>
      <HeaderContent
        header={header}
        isLoading={isLoading}
        isResizing={false}
        onClick={onColumnSort}
        showSortingCapability={showSortingCapability}
        sort={sort}
      >
        <Actions
          header={header}
          isLoading={isLoading}
          onColumnRemoved={onColumnRemoved}
          sort={sort}
        />
      </HeaderContent>
    </>
  );
};

export const Header = React.memo(HeaderComponent);
