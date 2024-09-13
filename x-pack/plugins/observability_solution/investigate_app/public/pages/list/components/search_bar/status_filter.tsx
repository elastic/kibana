/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  useGeneratedHtmlId,
  EuiFilterButton,
  EuiFilterGroup,
  EuiPopover,
  EuiSelectable,
  EuiPopoverTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';

const STATUS_LABEL = i18n.translate('xpack.investigateApp.searchBar.statusFilterButtonLabel', {
  defaultMessage: 'Status',
});

interface Props {
  isLoading: boolean;
  onChange: (status: string[]) => void;
}

export function StatusFilter({ isLoading, onChange }: Props) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const filterStatusPopoverId = useGeneratedHtmlId({
    prefix: 'filterStatusPopover',
  });

  const onButtonClick = () => {
    setIsPopoverOpen(!isPopoverOpen);
  };

  const closePopover = () => {
    setIsPopoverOpen(false);
  };

  const [items, setItems] = useState<Array<{ label: string; checked?: 'on' | 'off' }>>([
    { label: 'triage' },
    { label: 'active' },
    { label: 'mitigated' },
    { label: 'resolved' },
    { label: 'cancelled' },
  ]);

  const button = (
    <EuiFilterButton
      iconType="arrowDown"
      badgeColor="success"
      onClick={onButtonClick}
      isSelected={isPopoverOpen}
      numFilters={items.length}
      hasActiveFilters={!!items.find((item) => item.checked === 'on')}
      numActiveFilters={items.filter((item) => item.checked === 'on').length}
    >
      {STATUS_LABEL}
    </EuiFilterButton>
  );
  return (
    <EuiFilterGroup>
      <EuiPopover
        id={filterStatusPopoverId}
        button={button}
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
      >
        <EuiSelectable
          searchable
          searchProps={{ compressed: true }}
          aria-label={STATUS_LABEL}
          options={items}
          onChange={(newOptions) => {
            setItems(newOptions);
            onChange(newOptions.filter((item) => item.checked === 'on').map((item) => item.label));
          }}
          isLoading={isLoading}
        >
          {(list, search) => (
            <div style={{ width: 300 }}>
              <EuiPopoverTitle paddingSize="s">{search}</EuiPopoverTitle>
              {list}
            </div>
          )}
        </EuiSelectable>
      </EuiPopover>
    </EuiFilterGroup>
  );
}
