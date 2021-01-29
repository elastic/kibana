/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiInputPopover, EuiSelectableOption, EuiFieldText } from '@elastic/eui';
import React, { memo, useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';

import { OpenTimelineResult } from '../../open_timeline/types';
import { SelectableTimeline } from '../selectable_timeline';
import * as i18n from '../translations';
import { TimelineType, TimelineTypeLiteral } from '../../../../../common/types/timeline';

const StyledEuiFieldText = styled(EuiFieldText)`
  padding-left: 12px;
  padding-right: 40px;

  &[readonly] {
    cursor: pointer;
    background-size: 0 100%;
    background-repeat: no-repeat;

    // To match EuiFieldText focus state
    &:focus {
      background-color: #fff;
      background-image: linear-gradient(
        to top,
        #006bb4,
        #006bb4 2px,
        transparent 2px,
        transparent 100%
      );
      background-size: 100% 100%;
    }
  }

  & + .euiFormControlLayoutIcons {
    left: unset;
    right: 12px;
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
      <StyledEuiFieldText
        readOnly
        disabled={isDisabled}
        onFocus={handleOpenPopover}
        value={timelineTitle ?? i18n.DEFAULT_TIMELINE_TITLE}
        icon="arrowDown"
      />
    ),
    [handleOpenPopover, isDisabled, timelineTitle]
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
              id: timelineType === TimelineType.template ? t.templateTimelineId : t.savedObjectId,
              key: `${t.title}-${index}`,
              title: t.title,
              checked: [t.savedObjectId, t.templateTimelineId].includes(timelineId)
                ? 'on'
                : undefined,
            } as EuiSelectableOption)
        ),
    ],
    [hideUntitled, timelineId, timelineType]
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
    </EuiInputPopover>
  );
};

export const SearchTimelineSuperSelect = memo(SearchTimelineSuperSelectComponent);
