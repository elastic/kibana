/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiFilterButton,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiSelectable,
} from '@elastic/eui';
import * as i18n from '../../../../detections/pages/detection_engine/rules/translations';
import { RULE_TYPE_STATUS_FILTER_TITLE } from '../info_callout/translations';

const TAGS_POPOVER_WIDTH = 274;

export interface TypeStatusFilterPopoverProps {
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
const TypeStatusFilterPopoverComponent = ({
  tags,
  selectedTags,
  onSelectedTagsChanged,
}: TypeStatusFilterPopoverProps) => {
  const [items, setItems] = useState<EuiSelectableOption[]>([
    { label: `${i18n.ELASTIC_RULES}`, checked: 'on' },
    { label: `${i18n.CUSTOM_RULES}`, checked: 'on' },
    { label: `${i18n.ENABLED_RULES}` },
    { label: `${i18n.DISABLED_RULES}` },
  ]);
  const [isPopoverOpen, setPopoverOpen] = useState(false);

  const selectedItems = items.filter((i) => i.checked === 'on');

  const triggerButton = (
    <EuiFilterButton
      grow
      iconSide={'left'}
      iconType="filterInCircle"
      onClick={() => setPopoverOpen(!isPopoverOpen)}
      numFilters={tags.length}
      isSelected={isPopoverOpen}
      hasActiveFilters={selectedItems.length > 0}
      numActiveFilters={selectedItems.length}
      data-test-subj="tags-filter-popover-button"
    >
      {RULE_TYPE_STATUS_FILTER_TITLE}
    </EuiFilterButton>
  );

  return (
    <EuiPopover
      ownFocus
      button={triggerButton}
      isOpen={isPopoverOpen}
      closePopover={() => setPopoverOpen(!isPopoverOpen)}
      panelPaddingSize="none"
      repositionOnScroll
      panelProps={{
        'data-test-subj': 'tags-filter-popover',
      }}
    >
      <EuiSelectable
        aria-label={i18n.RULES_TAG_SEARCH}
        options={items}
        onChange={(newOptions) => setItems(newOptions)}
      >
        {(list, search) => (
          <div style={{ width: TAGS_POPOVER_WIDTH }}>
            <EuiPopoverTitle paddingSize="s">{'Filters'}</EuiPopoverTitle>
            {list}
            <EuiPopoverFooter paddingSize="s">
              <EuiButtonEmpty
                disabled={selectedItems.length === 0}
                color={'danger'}
                iconType={'cross'}
                size="xs"
                css={`
                  width: 100%;
                `}
              >
                {'Clear all'}
              </EuiButtonEmpty>
            </EuiPopoverFooter>
          </div>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
};

TypeStatusFilterPopoverComponent.displayName = 'TypeStatusFilterPopoverComponent';

export const TypeStatusFilterPopover = React.memo(TypeStatusFilterPopoverComponent);

TypeStatusFilterPopover.displayName = 'TypeStatusFilterPopover';
