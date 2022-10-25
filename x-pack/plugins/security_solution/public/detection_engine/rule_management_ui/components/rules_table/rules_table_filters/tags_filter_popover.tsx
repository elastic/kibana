/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangeEvent } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiFilterButton,
  EuiFilterSelectItem,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiPopover,
  EuiText,
  EuiFieldSearch,
  EuiPopoverTitle,
} from '@elastic/eui';
import styled from 'styled-components';
import * as i18n from '../../../../../detections/pages/detection_engine/rules/translations';
import { toggleSelectedGroup } from '../../../../../common/components/ml_popover/jobs_table/filters/toggle_selected_group';
import { caseInsensitiveSort } from '../helpers';

interface TagsFilterPopoverProps {
  selectedTags: string[];
  tags: string[];
  onSelectedTagsChanged: (newTags: string[]) => void;
}

const PopoverContentWrapper = styled.div`
  width: 275px;
`;

const ScrollableDiv = styled.div`
  max-height: 250px;
  overflow-y: auto;
`;

const TagOverflowContainer = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

/**
 * Popover for selecting tags to filter on
 *
 * @param tags to display for filtering
 * @param onSelectedTagsChanged change listener to be notified when tag selection changes
 */
const TagsFilterPopoverComponent = ({
  tags,
  selectedTags,
  onSelectedTagsChanged,
}: TagsFilterPopoverProps) => {
  const sortedTags = useMemo(
    () => caseInsensitiveSort(Array.from(new Set([...tags, ...selectedTags]))),
    [selectedTags, tags]
  );
  const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [filterTags, setFilterTags] = useState(sortedTags);

  const tagsComponent = useMemo(() => {
    return filterTags.map((tag, index) => (
      <EuiFilterSelectItem
        checked={selectedTags.includes(tag) ? 'on' : undefined}
        key={`${index}-${tag}`}
        onClick={() => toggleSelectedGroup(tag, selectedTags, onSelectedTagsChanged)}
        title={tag}
      >
        <TagOverflowContainer>{tag}</TagOverflowContainer>
      </EuiFilterSelectItem>
    ));
  }, [onSelectedTagsChanged, selectedTags, filterTags]);

  const onSearchInputChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setSearchInput(event.target.value);
  }, []);

  useEffect(() => {
    setFilterTags(
      sortedTags.filter((tag) => tag.toLowerCase().includes(searchInput.toLowerCase()))
    );
  }, [sortedTags, searchInput]);

  return (
    <EuiPopover
      ownFocus
      button={
        <EuiFilterButton
          grow={true}
          data-test-subj={'tags-filter-popover-button'}
          iconType="arrowDown"
          onClick={() => setIsTagPopoverOpen(!isTagPopoverOpen)}
          numFilters={tags.length}
          isSelected={isTagPopoverOpen}
          hasActiveFilters={selectedTags.length > 0}
          numActiveFilters={selectedTags.length}
        >
          {i18n.TAGS}
        </EuiFilterButton>
      }
      isOpen={isTagPopoverOpen}
      closePopover={() => setIsTagPopoverOpen(!isTagPopoverOpen)}
      panelPaddingSize="none"
      repositionOnScroll
    >
      <PopoverContentWrapper>
        <EuiPopoverTitle>
          <EuiFieldSearch
            placeholder="Search tags"
            value={searchInput}
            onChange={onSearchInputChange}
            isClearable
            aria-label="Rules tag search"
          />
        </EuiPopoverTitle>
        <ScrollableDiv>{tagsComponent}</ScrollableDiv>
        {filterTags.length === 0 && (
          <EuiFlexGroup gutterSize="m" justifyContent="spaceAround">
            <EuiFlexItem grow={true}>
              <EuiPanel>
                <EuiText>{i18n.NO_TAGS_AVAILABLE}</EuiText>
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </PopoverContentWrapper>
    </EuiPopover>
  );
};

TagsFilterPopoverComponent.displayName = 'TagsFilterPopoverComponent';

export const TagsFilterPopover = React.memo(TagsFilterPopoverComponent);

TagsFilterPopover.displayName = 'TagsFilterPopover';
