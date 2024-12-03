/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectableOption, EuiFieldTextProps } from '@elastic/eui';
import { EuiInputPopover, EuiFieldText, htmlIdGenerator, keys } from '@elastic/eui';
import React, { memo, useCallback, useMemo, useState } from 'react';

import type { OpenTimelineResult } from '../../open_timeline/types';
import type { SelectableTimelineProps } from '../selectable_timeline';
import { SelectableTimeline } from '../selectable_timeline';
import * as i18n from '../translations';
import { type TimelineType, TimelineTypeEnum } from '../../../../../common/api/timeline';

interface SearchTimelineSuperSelectProps {
  isDisabled: boolean;
  hideUntitled?: boolean;
  timelineId: string | null;
  timelineTitle: string | null;
  timelineType?: TimelineType;
  placeholder?: string;
  onTimelineChange: (timelineTitle: string, timelineId: string | null) => void;
  'aria-label'?: string;
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
  timelineType = TimelineTypeEnum.template,
  onTimelineChange,
  placeholder,
  'aria-label': ariaLabel,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const handleClosePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, []);

  const handlePopover = useCallback(() => {
    setIsPopoverOpen((isOpen) => !isOpen);
  }, []);

  const handleKeyboardOpen = useCallback<NonNullable<EuiFieldTextProps['onKeyDown']>>((event) => {
    if (event.key === keys.ENTER) {
      setIsPopoverOpen(true);
    }
  }, []);

  const popoverId = useMemo(() => htmlIdGenerator('searchTimelinePopover')(), []);

  const superSelect = useMemo(
    () => (
      <EuiFieldText
        disabled={isDisabled}
        onClick={handlePopover}
        onKeyDown={handleKeyboardOpen}
        value={timelineTitle ?? i18n.DEFAULT_TIMELINE_TITLE}
        icon={!isDisabled ? { type: 'arrowDown', side: 'right' } : undefined}
        aria-label={ariaLabel}
        aria-controls={popoverId}
        aria-expanded={isPopoverOpen}
        role="combobox"
      />
    ),
    [
      ariaLabel,
      handleKeyboardOpen,
      isDisabled,
      isPopoverOpen,
      popoverId,
      timelineTitle,
      handlePopover,
    ]
  );

  const handleGetSelectableOptions = useCallback<SelectableTimelineProps['getSelectableOptions']>(
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
              id:
                timelineType === TimelineTypeEnum.template ? t.templateTimelineId : t.savedObjectId,
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
      id={popoverId}
      input={superSelect}
      isOpen={isPopoverOpen}
      closePopover={handleClosePopover}
      className="rightArrowIcon"
    >
      <SelectableTimeline
        hideUntitled={hideUntitled}
        getSelectableOptions={handleGetSelectableOptions}
        onClosePopover={handleClosePopover}
        onTimelineChange={onTimelineChange}
        timelineType={timelineType}
        placeholder={placeholder}
      />
    </EuiInputPopover>
  );
};

export const SearchTimelineSuperSelect = memo(SearchTimelineSuperSelectComponent);
