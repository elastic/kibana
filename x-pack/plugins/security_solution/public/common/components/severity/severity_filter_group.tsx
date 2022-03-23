/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo, useState } from 'react';

import {
  EuiFilterButton,
  EuiFilterGroup,
  EuiFilterSelectItem,
  EuiPopover,
  FilterChecked,
  useGeneratedHtmlId,
} from '@elastic/eui';

import { RiskSeverity } from '../../../../common/search_strategy';
import { SeverityCount } from './types';
import { RiskScore } from './common';

interface SeverityItems {
  risk: RiskSeverity;
  count: number;
  checked?: FilterChecked;
}
export const SeverityFilterGroup: React.FC<{
  severityCount: SeverityCount;
  selectedSeverities: RiskSeverity[];
  onSelect: (newSelection: RiskSeverity[]) => void;
  title: string;
}> = ({ severityCount, selectedSeverities, onSelect, title }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const onButtonClick = useCallback(() => {
    setIsPopoverOpen(!isPopoverOpen);
  }, [isPopoverOpen]);

  const closePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, []);

  const filterGroupPopoverId = useGeneratedHtmlId({
    prefix: 'filterGroupPopover',
  });

  const items: SeverityItems[] = useMemo(() => {
    const checked: FilterChecked = 'on';
    return (Object.keys(severityCount) as RiskSeverity[]).map((k) => ({
      risk: k,
      count: severityCount[k],
      checked: selectedSeverities.includes(k) ? checked : undefined,
    }));
  }, [severityCount, selectedSeverities]);

  const updateSeverityFilter = useCallback(
    (selectedSeverity: RiskSeverity) => {
      const currentSelection = selectedSeverities ?? [];
      const newSelection = currentSelection.includes(selectedSeverity)
        ? currentSelection.filter((s) => s !== selectedSeverity)
        : [...currentSelection, selectedSeverity];

      onSelect(newSelection);
    },
    [selectedSeverities, onSelect]
  );

  const totalActiveItem = useMemo(
    () => items.reduce((total, item) => (item.checked === 'on' ? total + item.count : total), 0),
    [items]
  );

  const button = useMemo(
    () => (
      <EuiFilterButton
        data-test-subj="risk-filter-button"
        hasActiveFilters={!!items.find((item) => item.checked === 'on')}
        iconType="arrowDown"
        isSelected={isPopoverOpen}
        numActiveFilters={totalActiveItem}
        onClick={onButtonClick}
      >
        {title}
      </EuiFilterButton>
    ),
    [isPopoverOpen, items, onButtonClick, totalActiveItem, title]
  );

  return (
    <EuiFilterGroup>
      <EuiPopover
        id={filterGroupPopoverId}
        button={button}
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
      >
        <div className="euiFilterSelect__items">
          {items.map((item, index) => (
            <EuiFilterSelectItem
              data-test-subj={`risk-filter-item-${item.risk}`}
              checked={item.checked}
              key={index + item.risk}
              onClick={() => updateSeverityFilter(item.risk)}
            >
              <RiskScore severity={item.risk} />
            </EuiFilterSelectItem>
          ))}
        </div>
      </EuiPopover>
    </EuiFilterGroup>
  );
};
