/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { css } from '@emotion/react';
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
  useEuiTheme,
} from '@elastic/eui';
import { isEqual } from 'lodash/fp';
import * as i18n from './translations';

type FilterOption<T extends string> = EuiSelectableOption<{
  key: string;
  label: T;
}>;

export type { FilterOption as MultiSelectFilterOption };

export const mapToMultiSelectOption = <T extends string>(options: T[]) => {
  return options.map((option) => {
    return {
      key: option,
      label: option,
    };
  });
};

const fromRawOptionsToEuiSelectableOptions = <T extends string>(
  options: Array<FilterOption<T>>,
  selectedOptionKeys: string[]
): Array<FilterOption<T>> => {
  return options.map(({ key, label }) => {
    const selectableOption: FilterOption<T> = { label, key };
    if (selectedOptionKeys.includes(key)) {
      selectableOption.checked = 'on';
    }
    selectableOption['data-test-subj'] = `options-filter-popover-item-${key.split(' ').join('-')}`;
    return selectableOption;
  });
};

const fromEuiSelectableOptionToRawOption = <T extends string>(
  options: Array<FilterOption<T>>
): string[] => {
  return options.map((option) => option.key);
};

const getEuiSelectableCheckedOptions = <T extends string>(options: Array<FilterOption<T>>) =>
  options.filter((option) => option.checked === 'on');

interface UseFilterParams<T extends string> {
  buttonLabel?: string;
  id: string;
  limit?: number;
  limitReachedMessage?: string;
  onChange: ({
    filterId,
    selectedOptionKeys,
  }: {
    filterId: string;
    selectedOptionKeys: string[];
  }) => void;
  options: Array<FilterOption<T>>;
  selectedOptionKeys?: string[];
  renderOption?: (option: FilterOption<T>) => React.ReactNode;
}
export const MultiSelectFilter = <T extends string>({
  buttonLabel,
  id,
  limit,
  limitReachedMessage,
  onChange,
  options: rawOptions,
  selectedOptionKeys = [],
  renderOption,
}: UseFilterParams<T>) => {
  const { euiTheme } = useEuiTheme();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const toggleIsPopoverOpen = () => setIsPopoverOpen((prevValue) => !prevValue);
  const isInvalid = Boolean(limit && limitReachedMessage && selectedOptionKeys.length >= limit);
  const options: Array<FilterOption<T>> = fromRawOptionsToEuiSelectableOptions(
    rawOptions,
    selectedOptionKeys
  );

  useEffect(() => {
    const newSelectedOptions = selectedOptionKeys.filter((selectedOptionKey) =>
      rawOptions.some(({ key: optionKey }) => optionKey === selectedOptionKey)
    );
    if (!isEqual(newSelectedOptions, selectedOptionKeys)) {
      onChange({
        filterId: id,
        selectedOptionKeys: newSelectedOptions,
      });
    }
  }, [selectedOptionKeys, rawOptions, id, onChange]);

  const _onChange = (newOptions: Array<FilterOption<T>>) => {
    const newSelectedOptions = getEuiSelectableCheckedOptions(newOptions);
    if (isInvalid && limit && newSelectedOptions.length >= limit) {
      return;
    }

    onChange({
      filterId: id,
      selectedOptionKeys: fromEuiSelectableOptionToRawOption(newSelectedOptions),
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
          hasActiveFilters={selectedOptionKeys.length > 0}
          numActiveFilters={selectedOptionKeys.length}
          aria-label={buttonLabel}
        >
          {buttonLabel}
        </EuiFilterButton>
      }
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      panelPaddingSize="none"
      repositionOnScroll
    >
      {isInvalid && (
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
      )}
      <EuiSelectable<FilterOption<T>>
        options={options}
        searchable
        searchProps={{ placeholder: buttonLabel, compressed: false }}
        emptyMessage={i18n.EMPTY_FILTER_MESSAGE}
        onChange={_onChange}
        singleSelection={false}
        renderOption={renderOption}
      >
        {(list, search) => (
          <div
            css={css`
              width: 400px;
            `}
          >
            <EuiPopoverTitle paddingSize="s">{search}</EuiPopoverTitle>
            <div
              css={css`
                line-height: ${euiTheme.size.xl};
                padding-left: ${euiTheme.size.m};
                border-bottom: ${euiTheme.border.thin};
              `}
            >
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

MultiSelectFilter.displayName = 'MultiSelectFilter';
