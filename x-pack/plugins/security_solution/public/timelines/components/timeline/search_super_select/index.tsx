/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiInputPopover, EuiSelectableOption, EuiSuperSelect } from '@elastic/eui';
import React, { memo, useCallback, useMemo, useState } from 'react';
import { createGlobalStyle } from 'styled-components';

import { OpenTimelineResult } from '../../open_timeline/types';
import { SelectableTimeline } from '../selectable_timeline';
import * as i18n from '../translations';
import { TimelineType, TimelineTypeLiteral } from '../../../../../common/types/timeline';

const SearchTimelineSuperSelectGlobalStyle = createGlobalStyle`
  .euiPopover__panel.euiPopover__panel-isOpen.timeline-search-super-select-popover__popoverPanel {
    visibility: hidden;
    z-index: 0;
  }
`;

interface SearchTimelineSuperSelectProps {
  isDisabled: boolean;
  hideUntitled?: boolean;
  timelineId: string | null;
  timelineTitle: string | null;
  timelineType?: TimelineTypeLiteral;
  onTimelineChange: (timelineTitle: string, timelineId: string | null) => void;
}

const basicSuperSelectOptions = [
  {
    value: '-1',
    inputDisplay: i18n.DEFAULT_TIMELINE_TITLE,
  },
];

const getBasicSelectableOptions = (timelineId: string) => [
  {
    description: i18n.DEFAULT_TIMELINE_DESCRIPTION,
    favorite: [],
    label: i18n.DEFAULT_TIMELINE_TITLE,
    id: undefined,
    title: i18n.DEFAULT_TIMELINE_TITLE,
    checked: timelineId === '-1' ? 'on' : undefined,
  } as EuiSelectableOption,
];

const SearchTimelineSuperSelectComponent: React.FC<SearchTimelineSuperSelectProps> = ({
  isDisabled,
  hideUntitled = false,
  timelineId,
  timelineTitle,
  timelineType = TimelineType.template,
  onTimelineChange,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const handleClosePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, []);

  const handleOpenPopover = useCallback(() => {
    setIsPopoverOpen(true);
  }, []);

  const superSelect = useMemo(
    () => (
      <EuiSuperSelect
        disabled={isDisabled}
        onFocus={handleOpenPopover}
        options={
          timelineId == null
            ? basicSuperSelectOptions
            : [
                {
                  value: timelineId,
                  inputDisplay: timelineTitle,
                },
              ]
        }
        valueOfSelected={timelineId == null ? '-1' : timelineId}
        itemLayoutAlign="top"
        hasDividers={false}
        popoverClassName="timeline-search-super-select-popover"
      />
    ),
    [handleOpenPopover, isDisabled, timelineId, timelineTitle]
  );

  const handleGetSelectableOptions = useCallback(
    ({ timelines, onlyFavorites, searchTimelineValue }) => [
      ...(!onlyFavorites && searchTimelineValue === ''
        ? getBasicSelectableOptions(timelineId == null ? '-1' : timelineId)
        : []),
      ...timelines
        .filter((t: OpenTimelineResult) => !hideUntitled || t.title !== '')
        .map(
          (t: OpenTimelineResult, index: number) =>
            ({
              description: t.description,
              favorite: t.favorite,
              label: t.title,
              id: t.savedObjectId,
              key: `${t.title}-${index}`,
              title: t.title,
              checked: t.savedObjectId === timelineId ? 'on' : undefined,
            } as EuiSelectableOption)
        ),
    ],
    [hideUntitled, timelineId]
  );

  return (
    <EuiInputPopover
      id="searchTimelinePopover"
      input={superSelect}
      isOpen={isPopoverOpen}
      closePopover={handleClosePopover}
    >
      <SelectableTimeline
        hideUntitled={hideUntitled}
        getSelectableOptions={handleGetSelectableOptions}
        onClosePopover={handleClosePopover}
        onTimelineChange={onTimelineChange}
        timelineType={timelineType}
      />
      <SearchTimelineSuperSelectGlobalStyle />
    </EuiInputPopover>
  );
};

export const SearchTimelineSuperSelect = memo(SearchTimelineSuperSelectComponent);
