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

const selectorLabel = i18n.translate('xpack.datasetQuality.selector.label', {
  defaultMessage: 'Options',
});

const selectorLoading = i18n.translate('xpack.datasetQuality.selector.loading', {
  defaultMessage: 'Loading',
});

const selectorSearchPlaceholder = i18n.translate(
  'xpack.datasetQuality.selector.search.placeholder',
  {
    defaultMessage: 'Filter options',
  }
);

const selectorNoneAvailable = i18n.translate('xpack.datasetQuality.selector.noneAvailable', {
  defaultMessage: 'No options available',
});

const selectorNoneMatching = i18n.translate('xpack.datasetQuality.selector.noneMatching', {
  defaultMessage: 'No options found',
});

interface SelectorProps {
  isLoading?: boolean;
  options: Item[];
  loadingMessage?: string;
  label?: string;
  searchPlaceholder?: string;
  noneAvailableMessage?: string;
  noneMatchingMessage?: string;
  onOptionsChange: (options: Item[]) => void;
}

export interface Item {
  label: string;
  checked?: EuiSelectableOptionCheckedType;
}

export function Selector({
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

  const renderOption = (option: Item) => <EuiText size="s">{option.label}</EuiText>;

  const button = (
    <EuiFilterButton
      data-test-subj="datasetQualitySelectableButton"
      iconType="arrowDown"
      badgeColor="success"
      onClick={onButtonClick}
      isSelected={isPopoverOpen}
      numFilters={options.length}
      hasActiveFilters={!!options.find((item) => item.checked === 'on')}
      numActiveFilters={options.filter((item) => item.checked === 'on').length}
    >
      {label ?? selectorLabel}
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
        data-test-subj="datasetQualitySelectableOptions"
        searchable
        searchProps={{
          placeholder: searchPlaceholder ?? selectorSearchPlaceholder,
          compressed: true,
        }}
        aria-label={label ?? selectorLabel}
        options={options}
        onChange={onOptionsChange}
        isLoading={isLoading}
        loadingMessage={loadingMessage ?? selectorLoading}
        emptyMessage={noneAvailableMessage ?? selectorNoneAvailable}
        noMatchesMessage={noneMatchingMessage ?? selectorNoneMatching}
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
