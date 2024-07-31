/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
import React, { useState } from 'react';
import * as i18n from './translations';

export interface MultiSelectFilterOption {
  key: string;
  label: string;
  checked?: 'on' | 'off';
}

interface UseFilterParams {
  buttonLabel?: string;
  onChange: (newOptions: MultiSelectFilterOption[]) => void;
  options: MultiSelectFilterOption[];
  renderOption?: (option: MultiSelectFilterOption) => React.ReactNode;
  selectedOptionKeys?: string[];
}

export const MultiSelectFilter: React.FC<UseFilterParams> = ({
  buttonLabel,
  onChange,
  options: rawOptions,
  selectedOptionKeys = [],
  renderOption,
}) => {
  const { euiTheme } = useEuiTheme();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const toggleIsPopoverOpen = () => setIsPopoverOpen((prevValue) => !prevValue);
  const options: MultiSelectFilterOption[] = rawOptions.map(({ key, label }) => ({
    label,
    key,
    checked: selectedOptionKeys.includes(key) ? 'on' : undefined,
  }));

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
        <EuiSelectable
          options={options}
          searchable
          searchProps={{
            placeholder: buttonLabel,
          }}
          emptyMessage="No options"
          onChange={onChange}
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
