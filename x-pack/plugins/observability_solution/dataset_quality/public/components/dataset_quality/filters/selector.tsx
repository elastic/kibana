/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFilterButton, EuiPopover, EuiPopoverTitle, EuiSelectable, EuiText } from '@elastic/eui';
import React, { useState } from 'react';
import type { EuiSelectableOptionCheckedType } from '@elastic/eui/src/components/selectable/selectable_option';
import { i18n } from '@kbn/i18n';

const selectorLoading = i18n.translate('xpack.datasetQuality.selector.loading', {
  defaultMessage: 'Loading',
});

interface SelectorProps {
  dataTestSubj?: string;
  isLoading?: boolean;
  options: Item[];
  loadingMessage?: string;
  label: string;
  searchPlaceholder: string;
  noneAvailableMessage: string;
  noneMatchingMessage: string;
  onOptionsChange: (options: Item[]) => void;
}

export interface Item {
  label: string;
  checked?: EuiSelectableOptionCheckedType;
}

export function Selector({
  dataTestSubj = 'datasetQualitySelectable',
  isLoading,
  options,
  loadingMessage,
  label,
  searchPlaceholder,
  noneAvailableMessage,
  noneMatchingMessage,
  onOptionsChange,
}: SelectorProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const onButtonClick = () => {
    setIsPopoverOpen(!isPopoverOpen);
  };

  const closePopover = () => {
    setIsPopoverOpen(false);
  };

  const renderOption = (option: Item) => (
    <EuiText size="s" data-test-subj={`${dataTestSubj}Option-${option.label}`}>
      {option.label}
    </EuiText>
  );

  const button = (
    <EuiFilterButton
      data-test-subj={`${dataTestSubj}Button`}
      iconType="arrowDown"
      badgeColor="accentSecondary"
      onClick={onButtonClick}
      isSelected={isPopoverOpen}
      numFilters={options.length}
      hasActiveFilters={!!options.find((item) => item.checked === 'on')}
      numActiveFilters={options.filter((item) => item.checked === 'on').length}
    >
      {label}
    </EuiFilterButton>
  );

  return (
    <EuiPopover
      button={button}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
    >
      <EuiSelectable
        data-test-subj={`${dataTestSubj}Options`}
        searchable
        searchProps={{
          placeholder: searchPlaceholder,
          compressed: true,
        }}
        aria-label={label}
        options={options}
        onChange={onOptionsChange}
        isLoading={isLoading}
        loadingMessage={loadingMessage ?? selectorLoading}
        emptyMessage={noneAvailableMessage}
        noMatchesMessage={noneMatchingMessage}
        renderOption={(option) => renderOption(option)}
      >
        {(list, search) => (
          <div style={{ width: 300 }}>
            <EuiPopoverTitle paddingSize="s">{search}</EuiPopoverTitle>
            {list}
          </div>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
}
