/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import {
  EuiPopoverTitle,
  EuiCallOut,
  EuiHorizontalRule,
  EuiPopover,
  EuiSelectable,
  EuiFilterButton,
  EuiTextColor,
  EuiSpacer,
} from '@elastic/eui';
import type { FilterOptions } from '../../../common/ui/types';
import * as i18n from './translations';

const fromRawOptionsToEuiSelectableOptions = (options: string[], selectedOptions: string[]) => {
  return options.map((option) => {
    const selectableOption: EuiSelectableOption = { label: option };
    if (selectedOptions.includes(option)) {
      selectableOption.checked = 'on';
    }
    return selectableOption;
  });
};

const fromEuiSelectableOptionToRawOption = (options: EuiSelectableOption[]) =>
  options.map((option) => option.label);

const getEuiSelectableCheckedOptions = (options: EuiSelectableOption[]) =>
  options.filter((option) => option.checked === 'on');

interface UseFilterParams {
  buttonLabel?: string;
  id: keyof FilterOptions;
  limit?: number;
  limitReachedMessage?: string;
  onChange: ({ filterId, options }: { filterId: keyof FilterOptions; options: string[] }) => void;
  options: string[];
  selectedOptions?: string[];
  renderOption?: (option: EuiSelectableOption) => React.ReactNode;
}
export const MultiSelectFilterComponent = ({
  buttonLabel,
  id,
  limit,
  limitReachedMessage,
  onChange,
  options: rawOptions,
  selectedOptions = [],
  renderOption,
}: UseFilterParams) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const toggleIsPopoverOpen = () => setIsPopoverOpen(!isPopoverOpen);

  const options = fromRawOptionsToEuiSelectableOptions(rawOptions, selectedOptions);
  const _onChange = (newOptions: EuiSelectableOption[]) => {
    onChange({
      filterId: id,
      options: fromEuiSelectableOptionToRawOption(getEuiSelectableCheckedOptions(newOptions)),
    });
  };

  return (
    <EuiPopover
      ownFocus
      button={
        <EuiFilterButton
          data-test-subj={`options-filter-popover-button-${id}`}
          iconType="arrowDown"
          onClick={toggleIsPopoverOpen}
          isSelected={isPopoverOpen}
          numFilters={options.length}
          hasActiveFilters={selectedOptions.length > 0}
          numActiveFilters={selectedOptions.length}
          aria-label={buttonLabel}
        >
          {buttonLabel}
        </EuiFilterButton>
      }
      isOpen={isPopoverOpen}
      closePopover={toggleIsPopoverOpen}
      panelPaddingSize="none"
      repositionOnScroll
    >
      {limit && limitReachedMessage && selectedOptions.length >= limit ? (
        <>
          <EuiHorizontalRule margin="none" />
          <EuiCallOut
            title={limitReachedMessage}
            color="warning"
            size="s"
            data-test-subj="maximum-length-warning"
          />
          <EuiHorizontalRule margin="none" />
        </>
      ) : null}
      <EuiSelectable
        options={options}
        searchable
        searchProps={{ placeholder: id, compressed: false }}
        emptyMessage={i18n.EMPTY_FILTER_MESSAGE}
        onChange={_onChange}
        singleSelection={false}
        renderOption={renderOption}
      >
        {(list, search) => (
          <div style={{ width: '400px' }}>
            <EuiPopoverTitle paddingSize="s">{search}</EuiPopoverTitle>
            <div style={{ lineHeight: '32px', marginLeft: '16px' }}>
              <EuiTextColor color="subdued">{i18n.OPTIONS(options.length)}</EuiTextColor>
            </div>
            <EuiSpacer size="xs" />
            {list}
          </div>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
};

MultiSelectFilterComponent.displayName = 'MultiSelectFilterComponent';

export const MultiSelectFilter = React.memo(MultiSelectFilterComponent);
