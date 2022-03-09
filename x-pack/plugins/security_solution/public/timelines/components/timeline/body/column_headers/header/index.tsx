/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { noop } from 'lodash/fp';
import React, { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { isDataViewFieldSubtypeNested } from '@kbn/es-query';

import { ColumnHeaderOptions } from '../../../../../../../common/types';
import {
  useDeepEqualSelector,
  useShallowEqualSelector,
} from '../../../../../../common/hooks/use_selector';
import { timelineActions, timelineSelectors } from '../../../../../store/timeline';
import { OnFilterChange } from '../../../events';
import { Sort } from '../../sort';
import { Actions } from '../actions';
import { Filter } from '../filter';
import { getNewSortDirectionOnClick } from './helpers';
import { HeaderContent } from './header_content';
import { isEqlOnSelector } from './selectors';

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
  const getIsEqlOn = useMemo(() => isEqlOnSelector(), []);
  const isEqlOn = useShallowEqualSelector((state) => getIsEqlOn(state, timelineId));

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

  const getManageTimeline = useMemo(() => timelineSelectors.getManageTimelineById(), []);
  const { isLoading } = useDeepEqualSelector(
    (state) => getManageTimeline(state, timelineId) || { isLoading: false }
  );
  const showSortingCapability = !isEqlOn && !isDataViewFieldSubtypeNested(header);

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

      <Filter header={header} onFilterChange={onFilterChange} />
    </>
  );
};

export const Header = React.memo(HeaderComponent);
