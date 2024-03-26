/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
import { css } from '@emotion/css';
import { EuiComboBox, EuiFilterButton, EuiPopover } from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';
import * as i18n from '../../../../../detections/pages/detection_engine/rules/translations';
import { caseInsensitiveSort } from '../helpers';

const TAGS_POPOVER_WIDTH = 400;

const popoverContentClassName = css`
  /* Subtract margins to ensure popover content fits on smaller screen widths */
  width: calc(100vw - ${euiThemeVars.euiSizeL} - ${euiThemeVars.euiSizeL});
  max-width: ${TAGS_POPOVER_WIDTH}px;
`;

interface TagsFilterPopoverProps {
  selectedTags: string[];
  tags: string[];
  onSelectedTagsChanged: (newTags: string[]) => void;
}

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
  const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);

  const options = useMemo(() => caseInsensitiveSort(tags).map((tag) => ({ label: tag })), [tags]);

  const selectedOptions = useMemo(
    () => selectedTags.map((tag) => ({ label: tag })),
    [selectedTags]
  );

  const triggerButton = (
    <EuiFilterButton
      grow
      iconType="arrowDown"
      onClick={() => setIsTagPopoverOpen(!isTagPopoverOpen)}
      numFilters={tags.length}
      isSelected={isTagPopoverOpen}
      hasActiveFilters={selectedTags.length > 0}
      numActiveFilters={selectedTags.length}
      data-test-subj="tags-filter-popover-button"
    >
      {i18n.TAGS}
    </EuiFilterButton>
  );

  return (
    <EuiPopover
      ownFocus
      button={triggerButton}
      isOpen={isTagPopoverOpen}
      closePopover={() => setIsTagPopoverOpen(!isTagPopoverOpen)}
      panelPaddingSize="s"
      repositionOnScroll
      panelProps={{
        'data-test-subj': 'tags-filter-popover',
      }}
    >
      <div className={popoverContentClassName}>
        <EuiComboBox
          placeholder={i18n.SEARCH_TAGS}
          options={options}
          selectedOptions={selectedOptions}
          onChange={(updatedOptions) =>
            onSelectedTagsChanged(updatedOptions.map((option) => option.label))
          }
          autoFocus
          aria-label={i18n.RULES_TAG_SEARCH}
        />
      </div>
    </EuiPopover>
  );
};

TagsFilterPopoverComponent.displayName = 'TagsFilterPopoverComponent';

export const TagsFilterPopover = React.memo(TagsFilterPopoverComponent);

TagsFilterPopover.displayName = 'TagsFilterPopover';
