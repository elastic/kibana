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
import type { CoverageOverviewRuleActivity } from '../../../../../common/api/detection_engine';
import {
  coverageOverviewFilterWidth,
  ruleActivityFilterDefaultOptions,
  ruleActivityFilterLabelMap,
} from './constants';
import * as i18n from './translations';
import { populateSelected, extractSelected } from './helpers';

export interface RuleActivityFilterComponentProps {
  selected: CoverageOverviewRuleActivity[];
  onChange: (options: CoverageOverviewRuleActivity[]) => void;
  isLoading: boolean;
}

const RuleActivityFilterComponent = ({
  selected,
  onChange,
  isLoading,
}: RuleActivityFilterComponentProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const onButtonClick = useCallback(() => {
    setIsPopoverOpen(!isPopoverOpen);
  }, [isPopoverOpen]);
  const closePopover = () => {
    setIsPopoverOpen(false);
  };

  const numActiveFilters = useMemo(() => selected.length, [selected]);

  const options = populateSelected(ruleActivityFilterDefaultOptions, selected);

  const handleSelectableOnChange = useCallback(
    (newOptions) => {
      const formattedOptions = extractSelected<CoverageOverviewRuleActivity>(newOptions);
      onChange(formattedOptions);
    },
    [onChange]
  );

  const handleOnClear = useCallback(() => {
    onChange([]);
  }, [onChange]);

  const renderOptionLabel = (option: EuiSelectableOption) =>
    ruleActivityFilterLabelMap[option.label];

  const button = useMemo(
    () => (
      <EuiFilterButton
        data-test-subj="coverageOverviewRuleActivityFilterButton"
        isLoading={isLoading}
        iconType="arrowDown"
        onClick={onButtonClick}
        isSelected={isPopoverOpen}
        hasActiveFilters={numActiveFilters > 0}
        numActiveFilters={numActiveFilters}
      >
        {i18n.CoverageOverviewRuleActivityFilterLabel}
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
        id="ruleActivityFilterPopover"
        button={button}
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
      >
        <EuiPopoverTitle paddingSize="s">{i18n.CoverageOverviewFilterPopoverTitle}</EuiPopoverTitle>
        <EuiSelectable
          data-test-subj="coverageOverviewFilterList"
          isLoading={isLoading}
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
            isDisabled={numActiveFilters === 0 || isLoading}
            onClick={handleOnClear}
          >
            {i18n.CoverageOverviewFilterPopoverClearAll}
          </EuiButtonEmpty>
        </EuiPopoverFooter>
      </EuiPopover>
    </EuiFilterGroup>
  );
};

export const RuleActivityFilter = React.memo(RuleActivityFilterComponent);
