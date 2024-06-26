/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectableOption } from '@elastic/eui';
import {
  EuiFilterButton,
  EuiFilterGroup,
  EuiPopover,
  EuiPopoverTitle,
  EuiSelectable,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { isEqual } from 'lodash/fp';
import React, { useEffect, useState } from 'react';
import * as i18n from './translations';

type FilterOption<T extends string, K extends string = string> = EuiSelectableOption<{
  key: K;
  label: T;
}>;

export type { FilterOption as MultiSelectFilterOption };

export const mapToMultiSelectOption = <T extends string>(
  options: T[],
  labelsMap?: Record<string, string>
) => {
  return options.map((option) => {
    return {
      key: option,
      label: labelsMap ? (labelsMap[option] as T) : option,
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
  buttonLabel?: string;
  id: string;
  onChange: (params: { filterId: string; selectedOptionKeys: string[] }) => void;
  options: Array<FilterOption<T, K>>;
  renderOption?: (option: FilterOption<T, K>) => React.ReactNode;
  selectedOptionKeys?: string[];
}
export const MultiSelectFilter = <T extends string, K extends string = string>({
  buttonLabel,
  id,
  onChange,
  options: rawOptions,
  selectedOptionKeys = [],
  renderOption,
}: UseFilterParams<T, K>) => {
  const { euiTheme } = useEuiTheme();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const toggleIsPopoverOpen = () => setIsPopoverOpen((prevValue) => !prevValue);
  const options = fromRawOptionsToEuiSelectableOptions(rawOptions, selectedOptionKeys);

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

  const _onChange = (newOptions: Array<FilterOption<T, K>>) => {
    const newSelectedOptions = getEuiSelectableCheckedOptions(newOptions);

    onChange({
      filterId: id,
      selectedOptionKeys: fromEuiSelectableOptionToRawOption(newSelectedOptions),
    });
  };

  return (
    <EuiFilterGroup>
      <EuiPopover
        ownFocus
        button={
          <EuiFilterButton
            iconType={'arrowDown'}
            onClick={toggleIsPopoverOpen}
            isSelected={isPopoverOpen}
            numFilters={options.length}
            hasActiveFilters={selectedOptionKeys.length > 0}
            numActiveFilters={selectedOptionKeys.length}
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
      >
        <EuiSelectable<FilterOption<T, K>>
          options={options}
          searchable
          searchProps={{
            placeholder: buttonLabel,
            compressed: false,
          }}
          emptyMessage="No options"
          onChange={_onChange}
          singleSelection={false}
          renderOption={renderOption}
        >
          {(list, search) => (
            <div>
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
