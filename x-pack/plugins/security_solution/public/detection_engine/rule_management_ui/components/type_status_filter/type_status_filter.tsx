/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiFilterButton,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiSelectable,
} from '@elastic/eui';
import { css } from '@emotion/react';
import * as i18n from './translations';

const POPOVER_WIDTH = 275;

export interface TypeStatusFilterPopoverProps {
  selectedFilters: string[];
  onFilterChanged: (newFilters: string[]) => void;
}

/**
 * Filter component for selecting Rule Type and Status filters
 *
 * @param selectedFilters filters that are currently selected
 * @param onFilterChanged change listener to be notified of filter selection changes
 */
const TypeStatusFilterPopoverComponent: React.FC<TypeStatusFilterPopoverProps> = ({
  selectedFilters,
  onFilterChanged,
}: TypeStatusFilterPopoverProps) => {
  const [isPopoverOpen, setPopoverOpen] = useState(false);
  const [items, setItems] = useState<EuiSelectableOption[]>([
    { label: `${i18n.ELASTIC_RULES}`, checked: 'on' },
    { label: `${i18n.CUSTOM_RULES}`, checked: 'on' },
    { label: `${i18n.ENABLED_RULES}` },
    { label: `${i18n.DISABLED_RULES}` },
  ]);

  const clearItems = useCallback(() => {
    setItems(items.map((i) => ({ ...i, checked: undefined })));
  }, []);

  const selectedItems = items.filter((i) => i.checked === 'on');

  const triggerButton = (
    <EuiFilterButton
      grow
      iconSide={'left'}
      iconType="filterInCircle"
      onClick={() => setPopoverOpen(!isPopoverOpen)}
      numFilters={items.length}
      isSelected={isPopoverOpen}
      hasActiveFilters={selectedItems.length > 0}
      numActiveFilters={selectedItems.length}
      data-test-subj="rule-status-filter-popover-button"
    >
      {i18n.TITLE}
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
        'data-test-subj': 'rule-status-filter-popover',
      }}
    >
      <EuiSelectable
        aria-label={i18n.TITLE}
        options={items}
        onChange={(newOptions) => setItems(newOptions)}
      >
        {(list, search) => (
          <div style={{ width: POPOVER_WIDTH }}>
            <EuiPopoverTitle paddingSize="s">{'Filters'}</EuiPopoverTitle>
            {list}
            <EuiPopoverFooter paddingSize="s">
              <EuiButtonEmpty
                onClick={clearItems}
                disabled={selectedItems.length === 0}
                color={'danger'}
                iconType={'cross'}
                size="xs"
                css={css`
                  width: 100%;
                `}
              >
                {i18n.CLEAR_ALL}
              </EuiButtonEmpty>
            </EuiPopoverFooter>
          </div>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
};

export const TypeStatusFilterPopover = React.memo(TypeStatusFilterPopoverComponent);
TypeStatusFilterPopover.displayName = 'TypeStatusFilterPopover';
