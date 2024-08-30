/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import {
  EuiPopover,
  EuiFilterButton,
  EuiSelectable,
  EuiFilterGroup,
  EuiPopoverTitle,
  EuiButtonEmpty,
  EuiPopoverFooter,
} from '@elastic/eui';
import { css } from '@emotion/css';
import type { CoverageOverviewRuleSource } from '../../../../../common/api/detection_engine';
import {
  coverageOverviewFilterWidth,
  ruleSourceFilterDefaultOptions,
  ruleSourceFilterLabelMap,
} from './constants';
import * as i18n from './translations';
import { populateSelected, extractSelected } from './helpers';

export interface RuleSourceFilterComponentProps {
  selected: CoverageOverviewRuleSource[];
  onChange: (options: CoverageOverviewRuleSource[]) => void;
  isLoading: boolean;
}

const RuleSourceFilterComponent = ({
  selected,
  onChange,
  isLoading,
}: RuleSourceFilterComponentProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const onButtonClick = useCallback(() => {
    setIsPopoverOpen(!isPopoverOpen);
  }, [isPopoverOpen]);
  const closePopover = () => {
    setIsPopoverOpen(false);
  };

  const numActiveFilters = useMemo(() => selected.length, [selected]);

  const options = populateSelected(
    ruleSourceFilterDefaultOptions,
    selected
  ) as EuiSelectableOption[];

  const handleSelectableOnChange = useCallback(
    (newOptions) => {
      const formattedOptions = extractSelected<CoverageOverviewRuleSource>(newOptions);
      onChange(formattedOptions);
    },
    [onChange]
  );

  const handleOnClear = useCallback(() => {
    onChange([]);
  }, [onChange]);

  const renderOptionLabel = (option: EuiSelectableOption) => ruleSourceFilterLabelMap[option.label];

  const button = useMemo(
    () => (
      <EuiFilterButton
        data-test-subj="coverageOverviewRuleSourceFilterButton"
        isLoading={isLoading}
        iconType="arrowDown"
        onClick={onButtonClick}
        isSelected={isPopoverOpen}
        hasActiveFilters={numActiveFilters > 0}
        numActiveFilters={numActiveFilters}
      >
        {i18n.CoverageOverviewRuleSourceFilterLabel}
      </EuiFilterButton>
    ),
    [isPopoverOpen, numActiveFilters, onButtonClick, isLoading]
  );
  return (
    <EuiFilterGroup
      css={css`
        width: ${coverageOverviewFilterWidth}px;
      `}
    >
      <EuiPopover
        id="ruleSourceFilterPopover"
        button={button}
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
      >
        <EuiPopoverTitle paddingSize="s">{i18n.CoverageOverviewFilterPopoverTitle}</EuiPopoverTitle>
        <EuiSelectable
          data-test-subj="coverageOverviewFilterList"
          options={options}
          onChange={handleSelectableOnChange}
          renderOption={renderOptionLabel}
        >
          {(list) => (
            <div
              css={css`
                width: ${coverageOverviewFilterWidth}px;
              `}
            >
              {list}
            </div>
          )}
        </EuiSelectable>
        <EuiPopoverFooter paddingSize="xs">
          <EuiButtonEmpty
            css={css`
              width: 100%;
            `}
            iconType="cross"
            color="danger"
            size="xs"
            isDisabled={numActiveFilters === 0}
            onClick={handleOnClear}
          >
            {i18n.CoverageOverviewFilterPopoverClearAll}
          </EuiButtonEmpty>
        </EuiPopoverFooter>
      </EuiPopover>
    </EuiFilterGroup>
  );
};

export const RuleSourceFilter = React.memo(RuleSourceFilterComponent);
