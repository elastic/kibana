/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo, useState } from 'react';

import type { FilterChecked } from '@elastic/eui';
import {
  EuiFilterButton,
  EuiFilterGroup,
  EuiFilterSelectItem,
  EuiPopover,
  useGeneratedHtmlId,
  useEuiTheme,
} from '@elastic/eui';

import { SEVERITY_UI_SORT_ORDER } from '../../../../entity_analytics/common/utils';
import type { RiskScoreEntity, RiskSeverity } from '../../../../../common/search_strategy';
import type { SeverityCount } from './types';
import { RiskScoreLevel } from './common';
import { ENTITY_RISK_LEVEL } from '../translations';
import { useKibana } from '../../../../common/lib/kibana';

interface SeverityItems {
  risk: RiskSeverity;
  count: number;
  checked?: FilterChecked;
}
export const SeverityFilterGroup: React.FC<{
  severityCount: SeverityCount;
  selectedSeverities: RiskSeverity[];
  onSelect: (newSelection: RiskSeverity[]) => void;
  riskEntity: RiskScoreEntity;
}> = ({ severityCount, selectedSeverities, onSelect, riskEntity }) => {
  const { euiTheme } = useEuiTheme();
  const { telemetry } = useKibana().services;
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
    return SEVERITY_UI_SORT_ORDER.map((severity) => ({
      risk: severity,
      count: severityCount[severity],
      checked: selectedSeverities.includes(severity) ? checked : undefined,
    }));
  }, [severityCount, selectedSeverities]);

  const updateSeverityFilter = useCallback(
    (selectedSeverity: RiskSeverity) => {
      const currentSelection = selectedSeverities ?? [];
      const isAddingSeverity = !currentSelection.includes(selectedSeverity);

      const newSelection = isAddingSeverity
        ? [...currentSelection, selectedSeverity]
        : currentSelection.filter((s) => s !== selectedSeverity);

      if (isAddingSeverity) {
        telemetry.reportEntityRiskFiltered({ entity: riskEntity, selectedSeverity });
      }

      onSelect(newSelection);
    },
    [selectedSeverities, onSelect, telemetry, riskEntity]
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
        {ENTITY_RISK_LEVEL(riskEntity)}
      </EuiFilterButton>
    ),
    [isPopoverOpen, items, onButtonClick, totalActiveItem, riskEntity]
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
        {/* EUI NOTE: Please use EuiSelectable (which already has height/scrolling built in)
            instead of EuiFilterSelectItem (which is pending deprecation).
            @see https://elastic.github.io/eui/#/forms/filter-group#multi-select */}
        <div className="eui-yScroll" css={{ maxHeight: euiTheme.base * 30 }}>
          {items.map((item, index) => (
            <EuiFilterSelectItem
              data-test-subj={`risk-filter-item-${item.risk}`}
              checked={item.checked}
              key={index + item.risk}
              onClick={() => updateSeverityFilter(item.risk)}
            >
              <RiskScoreLevel severity={item.risk} />
            </EuiFilterSelectItem>
          ))}
        </div>
      </EuiPopover>
    </EuiFilterGroup>
  );
};
