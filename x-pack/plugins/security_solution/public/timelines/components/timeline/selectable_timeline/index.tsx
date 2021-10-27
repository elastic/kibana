/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiSelectable,
  EuiHighlight,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiTextColor,
  EuiSelectableOption,
  EuiSelectableProps,
  EuiFilterButton,
} from '@elastic/eui';
import { isEmpty, debounce } from 'lodash/fp';
import React, { memo, useCallback, useMemo, useState, useEffect, useRef } from 'react';
import styled from 'styled-components';

import {
  TimelineTypeLiteralWithNull,
  TimelineTypeLiteral,
  SortFieldTimeline,
} from '../../../../../common/types/timeline';

import { useGetAllTimeline } from '../../../containers/all';
import { isUntitled } from '../../open_timeline/helpers';
import * as i18nTimeline from '../../open_timeline/translations';
import { OpenTimelineResult } from '../../open_timeline/types';
import { getEmptyTagValue } from '../../../../common/components/empty_value';
import * as i18n from '../translations';
import { Direction } from '../../../../../common/search_strategy';

const MyEuiFlexItem = styled(EuiFlexItem)`
  display: inline-block;
  max-width: 296px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledEuiFilterButton = styled(EuiFilterButton)`
  border-top: 0;
  border-bottom: 0;
`;

export const ORIGINAL_PAGE_SIZE = 50;
const POPOVER_HEIGHT = 260;
const TIMELINE_ITEM_HEIGHT = 50;

export interface GetSelectableOptions {
  timelines: OpenTimelineResult[];
  onlyFavorites: boolean;
  timelineType?: TimelineTypeLiteralWithNull;
  searchTimelineValue: string;
}

export interface SelectableTimelineProps {
  hideUntitled?: boolean;
  getSelectableOptions: ({
    timelines,
    onlyFavorites,
    timelineType,
    searchTimelineValue,
  }: GetSelectableOptions) => EuiSelectableOption[];
  onClosePopover: () => void;
  onTimelineChange: (
    timelineTitle: string,
    timelineId: string | null,
    graphEventId?: string
  ) => void;
  timelineType: TimelineTypeLiteral;
}

const SelectableTimelineComponent: React.FC<SelectableTimelineProps> = ({
  hideUntitled = false,
  getSelectableOptions,
  onClosePopover,
  onTimelineChange,
  timelineType,
}) => {
  const [pageSize, setPageSize] = useState(ORIGINAL_PAGE_SIZE);
  const [heightTrigger, setHeightTrigger] = useState(0);
  const [searchTimelineValue, setSearchTimelineValue] = useState<string>('');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const { fetchAllTimeline, timelines, loading, totalCount: timelineCount } = useGetAllTimeline();
  const selectableListOuterRef = useRef<HTMLDivElement | null>(null);
  const selectableListInnerRef = useRef<HTMLDivElement | null>(null);

  const debouncedSetSearchTimelineValue = useMemo(() => debounce(500, setSearchTimelineValue), []);

  const onSearchTimeline = useCallback(
    (val) => {
      debouncedSetSearchTimelineValue(val);
    },
    [debouncedSetSearchTimelineValue]
  );

  const handleOnToggleOnlyFavorites = useCallback(() => {
    setOnlyFavorites(!onlyFavorites);
  }, [onlyFavorites]);

  const handleOnScroll = useCallback(
    (totalTimelines: number, totalCount: number, scrollOffset: number) => {
      if (
        totalTimelines < totalCount &&
        selectableListOuterRef.current &&
        selectableListInnerRef.current
      ) {
        const clientHeight = selectableListOuterRef.current.clientHeight;
        const scrollHeight = selectableListInnerRef.current.clientHeight;
        const clientHeightTrigger = clientHeight * 1.2;
        if (
          scrollOffset > 10 &&
          scrollHeight - scrollOffset < clientHeightTrigger &&
          scrollHeight > heightTrigger
        ) {
          setHeightTrigger(scrollHeight);
          setPageSize(pageSize + ORIGINAL_PAGE_SIZE);
        }
      }
    },
    [heightTrigger, pageSize]
  );

  const renderTimelineOption = useCallback(
    (option, searchValue) => (
      <EuiFlexGroup
        gutterSize="s"
        justifyContent="spaceBetween"
        alignItems="center"
        responsive={false}
      >
        <EuiFlexItem grow={false}>
          <EuiIcon type={`${option.checked === 'on' ? 'check' : 'empty'}`} color="primary" />
        </EuiFlexItem>
        <EuiFlexItem grow={true}>
          <EuiFlexGroup gutterSize="none" direction="column">
            <MyEuiFlexItem data-test-subj="timeline" grow={false}>
              <EuiHighlight search={searchValue}>
                {isUntitled(option) ? i18nTimeline.UNTITLED_TIMELINE : option.title}
              </EuiHighlight>
            </MyEuiFlexItem>
            <MyEuiFlexItem grow={false}>
              <EuiTextColor color="subdued" component="span">
                <small>
                  {option.description != null && option.description.trim().length > 0
                    ? option.description
                    : getEmptyTagValue()}
                </small>
              </EuiTextColor>
            </MyEuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIcon
            type={`${
              option.favorite != null && isEmpty(option.favorite) ? 'starEmpty' : 'starFilled'
            }`}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    []
  );

  const handleTimelineChange = useCallback(
    (options) => {
      const selectedTimeline = options.filter(
        (option: { checked: string }) => option.checked === 'on'
      );
      if (selectedTimeline != null && selectedTimeline.length > 0) {
        onTimelineChange(
          isEmpty(selectedTimeline[0].title)
            ? i18nTimeline.UNTITLED_TIMELINE
            : selectedTimeline[0].title,
          selectedTimeline[0].id === '-1' ? null : selectedTimeline[0].id,
          selectedTimeline[0].graphEventId ?? ''
        );
      }
      onClosePopover();
    },
    [onClosePopover, onTimelineChange]
  );

  const EuiSelectableContent = useCallback(
    (list, search) => (
      <>
        {search}
        {list}
      </>
    ),
    []
  );

  const searchProps: EuiSelectableProps['searchProps'] = useMemo(
    () => ({
      'data-test-subj': 'timeline-super-select-search-box',
      placeholder: i18n.SEARCH_BOX_TIMELINE_PLACEHOLDER(timelineType),
      onSearch: onSearchTimeline,
      incremental: true,
      append: (
        <StyledEuiFilterButton
          data-test-subj="only-favorites-toggle"
          hasActiveFilters={onlyFavorites}
          onClick={handleOnToggleOnlyFavorites}
        >
          {i18nTimeline.ONLY_FAVORITES}
        </StyledEuiFilterButton>
      ),
    }),
    [handleOnToggleOnlyFavorites, onSearchTimeline, onlyFavorites, timelineType]
  );

  const listProps: EuiSelectableProps['listProps'] = useMemo(
    () => ({
      rowHeight: TIMELINE_ITEM_HEIGHT,
      showIcons: false,
      windowProps: {
        onScroll: ({ scrollOffset }) =>
          handleOnScroll(
            (timelines ?? []).filter((t) => !hideUntitled || t.title !== '').length,
            timelineCount,
            scrollOffset
          ),
        outerRef: selectableListOuterRef,
        innerRef: selectableListInnerRef,
      },
    }),
    [handleOnScroll, hideUntitled, timelineCount, timelines]
  );

  useEffect(() => {
    fetchAllTimeline({
      pageInfo: {
        pageIndex: 1,
        pageSize,
      },
      search: searchTimelineValue,
      sort: {
        sortField: SortFieldTimeline.updated,
        sortOrder: Direction.desc,
      },
      onlyUserFavorite: onlyFavorites,
      status: null,
      timelineType,
    });
  }, [fetchAllTimeline, onlyFavorites, pageSize, searchTimelineValue, timelineType]);

  return (
    <EuiSelectable
      data-test-subj="selectable-input"
      height={POPOVER_HEIGHT}
      isLoading={loading && timelines == null}
      listProps={listProps}
      renderOption={renderTimelineOption}
      onChange={handleTimelineChange}
      searchable
      searchProps={searchProps}
      singleSelection={true}
      options={getSelectableOptions({
        timelines: timelines ?? [],
        onlyFavorites,
        searchTimelineValue,
        timelineType,
      })}
    >
      {EuiSelectableContent}
    </EuiSelectable>
  );
};

export const SelectableTimeline = memo(SelectableTimelineComponent);
