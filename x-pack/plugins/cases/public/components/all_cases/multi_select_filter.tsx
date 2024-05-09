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
  EuiFilterGroup,
  EuiText,
} from '@elastic/eui';
import { isEqual } from 'lodash/fp';
import * as i18n from './translations';

type FilterOption<T extends string, K extends string = string> = EuiSelectableOption<{
  key: K;
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

const fromRawOptionsToEuiSelectableOptions = <T extends string, K extends string>(
  options: Array<FilterOption<T, K>>,
  selectedOptionKeys: string[]
): Array<FilterOption<T, K>> => {
  return options.map(({ key, label }) => {
    const selectableOption: FilterOption<T, K> = { label, key };
    if (selectedOptionKeys.includes(key)) {
      selectableOption.checked = 'on';
    }
    selectableOption['data-test-subj'] = `options-filter-popover-item-${key.split(' ').join('-')}`;
    return selectableOption;
  });
};

const fromEuiSelectableOptionToRawOption = <T extends string, K extends string>(
  options: Array<FilterOption<T, K>>
): string[] => {
  return options.map((option) => option.key);
};

const getEuiSelectableCheckedOptions = <T extends string, K extends string>(
  options: Array<FilterOption<T, K>>
) => options.filter((option) => option.checked === 'on') as Array<FilterOption<T, K>>;

interface UseFilterParams<T extends string, K extends string = string> {
  buttonIconType?: string;
  buttonLabel?: string;
  hideActiveOptionsNumber?: boolean;
  id: string;
  limit?: number;
  limitReachedMessage?: string;
  onChange: (params: { filterId: string; selectedOptionKeys: string[] }) => void;
  options: Array<FilterOption<T, K>>;
  renderOption?: (option: FilterOption<T, K>) => React.ReactNode;
  selectedOptionKeys?: string[];
  transparentBackground?: boolean;
  isLoading: boolean;
}
export const MultiSelectFilter = <T extends string, K extends string = string>({
  buttonLabel,
  buttonIconType,
  hideActiveOptionsNumber,
  id,
  limit,
  limitReachedMessage,
  onChange,
  options: rawOptions,
  selectedOptionKeys = [],
  renderOption,
  transparentBackground,
  isLoading,
}: UseFilterParams<T, K>) => {
  const { euiTheme } = useEuiTheme();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const toggleIsPopoverOpen = () => setIsPopoverOpen((prevValue) => !prevValue);
  const showActiveOptionsNumber = !hideActiveOptionsNumber;
  const isInvalid = Boolean(limit && limitReachedMessage && selectedOptionKeys.length >= limit);
  const options = fromRawOptionsToEuiSelectableOptions(rawOptions, selectedOptionKeys);

  useEffect(() => {
    const newSelectedOptions = selectedOptionKeys.filter((selectedOptionKey) =>
      rawOptions.some(({ key: optionKey }) => optionKey === selectedOptionKey)
    );

    if (!isEqual(newSelectedOptions, selectedOptionKeys) && !isLoading) {
      onChange({
        filterId: id,
        selectedOptionKeys: newSelectedOptions,
      });
    }
  }, [selectedOptionKeys, rawOptions, id, onChange, isLoading]);

  const _onChange = (newOptions: Array<FilterOption<T, K>>) => {
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
    <EuiFilterGroup
      css={css`
        ${transparentBackground && 'background-color: transparent;'};
      `}
    >
      <EuiPopover
        ownFocus
        button={
          <EuiFilterButton
            css={css`
              max-width: 186px;
            `}
            data-test-subj={`options-filter-popover-button-${id}`}
            iconType={buttonIconType || 'arrowDown'}
            onClick={toggleIsPopoverOpen}
            isSelected={isPopoverOpen}
            numFilters={showActiveOptionsNumber ? options.length : undefined}
            hasActiveFilters={showActiveOptionsNumber ? selectedOptionKeys.length > 0 : undefined}
            numActiveFilters={showActiveOptionsNumber ? selectedOptionKeys.length : undefined}
            aria-label={buttonLabel}
          >
            <EuiText size="s" className="eui-textTruncate">
              {buttonLabel}
            </EuiText>
          </EuiFilterButton>
        }
        isOpen={isPopoverOpen}
        closePopover={() => setIsPopoverOpen(false)}
        panelPaddingSize="none"
        repositionOnScroll
        panelProps={{
          'data-test-subj': `options-filter-popover-panel-${id}`,
        }}
        data-test-subj={`options-filter-popover-${id}`}
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
        <EuiSelectable<FilterOption<T, K>>
          options={options}
          searchable
          searchProps={{
            placeholder: buttonLabel,
            compressed: false,
            'data-test-subj': `${id}-search-input`,
          }}
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
    </EuiFilterGroup>
  );
};

MultiSelectFilter.displayName = 'MultiSelectFilter';
