/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiSelectable,
  EuiHighlight,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiTextColor,
  EuiSelectableOption,
  EuiPortal,
  EuiFilterGroup,
  EuiFilterButton,
} from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import React, { memo, useCallback, useMemo, useState, useEffect } from 'react';
import { ListProps } from 'react-virtualized';
import styled from 'styled-components';

import {
  TimelineTypeLiteralWithNull,
  TimelineTypeLiteral,
} from '../../../../../common/types/timeline';

import { useGetAllTimeline } from '../../../containers/all';
import { SortFieldTimeline, Direction } from '../../../../graphql/types';
import { isUntitled } from '../../open_timeline/helpers';
import * as i18nTimeline from '../../open_timeline/translations';
import { OpenTimelineResult } from '../../open_timeline/types';
import { getEmptyTagValue } from '../../../../common/components/empty_value';
import * as i18n from '../translations';
import { useTimelineStatus } from '../../open_timeline/use_timeline_status';

const MyEuiFlexItem = styled(EuiFlexItem)`
  display: inline-block;
  max-width: 296px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const MyEuiFlexGroup = styled(EuiFlexGroup)`
  padding 0px 4px;
`;

const EuiSelectableContainer = styled.div<{ isLoading: boolean }>`
  .euiSelectable {
    .euiFormControlLayout__childrenWrapper {
      display: flex;
    }
    ${({ isLoading }) => `${
      isLoading
        ? `
      .euiFormControlLayoutIcons {
        display: none;
      }
      .euiFormControlLayoutIcons.euiFormControlLayoutIcons--right {
        display: block;
        left: 12px;
        top: 12px;
      }`
        : ''
    }
    `}
  }
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

export interface SearchProps {
  'data-test-subj'?: string;
  isLoading: boolean;
  placeholder: string;
  onSearch: (arg: string) => void;
  incremental: boolean;
  inputRef: (arg: HTMLElement) => void;
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
  const [searchRef, setSearchRef] = useState<HTMLElement | null>(null);
  const { fetchAllTimeline, timelines, loading, totalCount: timelineCount } = useGetAllTimeline();
  const { timelineStatus, templateTimelineType } = useTimelineStatus({ timelineType });

  const onSearchTimeline = useCallback((val) => {
    setSearchTimelineValue(val);
  }, []);

  const handleOnToggleOnlyFavorites = useCallback(() => {
    setOnlyFavorites(!onlyFavorites);
  }, [onlyFavorites]);

  const handleOnScroll = useCallback(
    (
      totalTimelines: number,
      totalCount: number,
      {
        clientHeight,
        scrollHeight,
        scrollTop,
      }: {
        clientHeight: number;
        scrollHeight: number;
        scrollTop: number;
      }
    ) => {
      if (totalTimelines < totalCount) {
        const clientHeightTrigger = clientHeight * 1.2;
        if (
          scrollTop > 10 &&
          scrollHeight - scrollTop < clientHeightTrigger &&
          scrollHeight > heightTrigger
        ) {
          setHeightTrigger(scrollHeight);
          setPageSize(pageSize + ORIGINAL_PAGE_SIZE);
        }
      }
    },
    [heightTrigger, pageSize]
  );

  const renderTimelineOption = useCallback((option, searchValue) => {
    return (
      <EuiFlexGroup
        gutterSize="s"
        justifyContent="spaceBetween"
        alignItems="center"
        responsive={false}
      >
        <EuiFlexItem grow={false}>
          <EuiIcon type={`${option.checked === 'on' ? 'check' : 'none'}`} color="primary" />
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
    );
  }, []);

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

  const favoritePortal = useMemo(
    () =>
      searchRef != null ? (
        <EuiPortal insert={{ sibling: searchRef, position: 'after' }}>
          <MyEuiFlexGroup gutterSize="xs" justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiFilterGroup>
                <EuiFilterButton
                  size="l"
                  data-test-subj="only-favorites-toggle"
                  hasActiveFilters={onlyFavorites}
                  onClick={handleOnToggleOnlyFavorites}
                >
                  {i18nTimeline.ONLY_FAVORITES}
                </EuiFilterButton>
              </EuiFilterGroup>
            </EuiFlexItem>
          </MyEuiFlexGroup>
        </EuiPortal>
      ) : null,
    [searchRef, onlyFavorites, handleOnToggleOnlyFavorites]
  );

  const searchProps: SearchProps = {
    'data-test-subj': 'timeline-super-select-search-box',
    isLoading: loading,
    placeholder: useMemo(() => i18n.SEARCH_BOX_TIMELINE_PLACEHOLDER(timelineType), [timelineType]),
    onSearch: onSearchTimeline,
    incremental: false,
    inputRef: (ref: HTMLElement) => {
      setSearchRef(ref);
    },
  };

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
      status: timelineStatus,
      timelineType,
      templateTimelineType,
    });
  }, [
    fetchAllTimeline,
    onlyFavorites,
    pageSize,
    searchTimelineValue,
    timelineType,
    timelineStatus,
    templateTimelineType,
  ]);

  return (
    <EuiSelectableContainer isLoading={loading}>
      <EuiSelectable
        data-test-subj="selectable-input"
        height={POPOVER_HEIGHT}
        isLoading={loading && timelines.length === 0}
        listProps={{
          rowHeight: TIMELINE_ITEM_HEIGHT,
          showIcons: false,
          virtualizedProps: ({
            onScroll: handleOnScroll.bind(
              null,
              timelines.filter((t) => !hideUntitled || t.title !== '').length,
              timelineCount
            ),
          } as unknown) as ListProps,
        }}
        renderOption={renderTimelineOption}
        onChange={handleTimelineChange}
        searchable
        searchProps={searchProps}
        singleSelection={true}
        options={getSelectableOptions({
          timelines,
          onlyFavorites,
          searchTimelineValue,
          timelineType,
        })}
      >
        {(list, search) => (
          <>
            {search}
            {favoritePortal}
            {list}
          </>
        )}
      </EuiSelectable>
    </EuiSelectableContainer>
  );
};

export const SelectableTimeline = memo(SelectableTimelineComponent);
