/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Dispatch, SetStateAction, useState } from 'react';
import {
  EuiFilterButton,
  EuiFilterSelectItem,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiPopover,
  EuiText,
} from '@elastic/eui';
import styled from 'styled-components';
import * as i18n from '../../translations';
import { toggleSelectedGroup } from '../../../../../components/ml_popover/jobs_table/filters/toggle_selected_group';

interface TagsFilterPopoverProps {
  selectedTags: string[];
  tags: string[];
  onSelectedTagsChanged: Dispatch<SetStateAction<string[]>>;
  isLoading: boolean; // TO DO reimplement?
}

const ScrollableDiv = styled.div`
  max-height: 250px;
  overflow: auto;
`;

/**
 * Popover for selecting tags to filter on
 *
 * @param tags to display for filtering
 * @param onSelectedTagsChanged change listener to be notified when tag selection changes
 */
export const TagsFilterPopoverComponent = ({
  tags,
  selectedTags,
  onSelectedTagsChanged,
}: TagsFilterPopoverProps) => {
  const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);

  return (
    <EuiPopover
      ownFocus
      button={
        <EuiFilterButton
          data-test-subj={'tags-filter-popover-button'}
          iconType="arrowDown"
          onClick={() => setIsTagPopoverOpen(!isTagPopoverOpen)}
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
    >
      <ScrollableDiv>
        {tags.map((tag, index) => (
          <EuiFilterSelectItem
            checked={selectedTags.includes(tag) ? 'on' : undefined}
            key={`${index}-${tag}`}
            onClick={() => toggleSelectedGroup(tag, selectedTags, onSelectedTagsChanged)}
          >
            {`${tag}`}
          </EuiFilterSelectItem>
        ))}
      </ScrollableDiv>
      {tags.length === 0 && (
        <EuiFlexGroup gutterSize="m" justifyContent="spaceAround">
          <EuiFlexItem grow={true}>
            <EuiPanel>
              <EuiText>{i18n.NO_TAGS_AVAILABLE}</EuiText>
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </EuiPopover>
  );
};

TagsFilterPopoverComponent.displayName = 'TagsFilterPopoverComponent';

export const TagsFilterPopover = React.memo(TagsFilterPopoverComponent);

TagsFilterPopover.displayName = 'TagsFilterPopover';
