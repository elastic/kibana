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

const fromRawOptionsToEuiSelectableOptions = (options: string[], selectedOptions: string[]) => {
  return options.map((option) => {
    const selectableOption: EuiSelectableOption = { label: option };
    if (selectedOptions.includes(option)) {
      selectableOption.checked = 'on';
    }
    selectableOption['data-test-subj'] = `options-filter-popover-item-${option
      .split(' ')
      .join('-')}`;
    return selectableOption;
  });
};

const fromEuiSelectableOptionToRawOption = (options: EuiSelectableOption[]) =>
  options.map((option) => option.label);

const getEuiSelectableCheckedOptions = (options: EuiSelectableOption[]) =>
  options.filter((option) => option.checked === 'on');

interface UseFilterParams<T> {
  buttonLabel?: string;
  hideActiveOptionsNumber?: boolean;
  id: string;
  limit?: number;
  limitReachedMessage?: string;
  onChange: ({ filterId, options }: { filterId: string; options: string[] }) => void;
  options: string[];
  renderOption?: (option: T) => React.ReactNode;
  selectedOptions?: string[];
}
export const MultiSelectFilter = <T extends EuiSelectableOption>({
  buttonLabel,
  hideActiveOptionsNumber,
  id,
  limit,
  limitReachedMessage,
  onChange,
  options: rawOptions,
  renderOption,
  selectedOptions = [],
}: UseFilterParams<T>) => {
  const { euiTheme } = useEuiTheme();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const toggleIsPopoverOpen = () => setIsPopoverOpen((prevValue) => !prevValue);
  const isInvalid = Boolean(limit && limitReachedMessage && selectedOptions.length >= limit);
  const options = fromRawOptionsToEuiSelectableOptions(rawOptions, selectedOptions);
  const showActiveOptionsNumber = !hideActiveOptionsNumber;

  useEffect(() => {
    const trimmedSelectedOptions = selectedOptions.filter((option) => rawOptions.includes(option));
    if (!isEqual(trimmedSelectedOptions, selectedOptions)) {
      onChange({
        filterId: id,
        options: trimmedSelectedOptions,
      });
    }
  }, [selectedOptions, rawOptions, id, onChange]);

  const _onChange = (newOptions: EuiSelectableOption[]) => {
    const newSelectedOptions = getEuiSelectableCheckedOptions(newOptions);
    if (isInvalid && limit && newSelectedOptions.length >= limit) {
      return;
    }

    onChange({
      filterId: id,
      options: fromEuiSelectableOptionToRawOption(newSelectedOptions),
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
          numFilters={showActiveOptionsNumber ? options.length : undefined} // FIXME: add tests to check that the number is not shown
          hasActiveFilters={showActiveOptionsNumber ? selectedOptions.length > 0 : undefined}
          numActiveFilters={showActiveOptionsNumber ? selectedOptions.length : undefined}
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
      <EuiSelectable<T>
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
