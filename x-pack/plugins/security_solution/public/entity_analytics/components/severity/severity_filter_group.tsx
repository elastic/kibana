/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo, useState } from 'react';

import type { FilterChecked, EuiSelectableProps } from '@elastic/eui';
import {
  EuiFilterButton,
  EuiFilterGroup,
  EuiPopover,
  useGeneratedHtmlId,
  EuiSelectable,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SEVERITY_UI_SORT_ORDER } from '../../common/utils';
import type { RiskScoreEntity, RiskSeverity } from '../../../../common/search_strategy';
import type { SeverityCount } from './types';
import { RiskScoreLevel } from './common';
import { ENTITY_RISK_LEVEL } from '../risk_score/translations';
import { useKibana } from '../../../common/lib/kibana';

interface SeverityItems {
  risk: RiskSeverity;
  count: number;
  checked?: FilterChecked;
  label: string;
}

const SEVERITY_FILTER_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.severityFilter.ariaLabel',
  {
    defaultMessage: 'Select the severity level to filter by',
  }
);

export const SeverityFilterGroup: React.FC<{
  severityCount: SeverityCount;
  selectedSeverities: RiskSeverity[];
  onSelect: (newSelection: RiskSeverity[]) => void;
  riskEntity: RiskScoreEntity;
}> = ({ severityCount, selectedSeverities, onSelect, riskEntity }) => {
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
      label: severity,
      checked: selectedSeverities.includes(severity) ? checked : undefined,
    }));
  }, [severityCount, selectedSeverities]);

  const updateSeverityFilter = useCallback<
    NonNullable<EuiSelectableProps<SeverityItems>['onChange']>
  >(
    (newSelection, _, changedSeverity) => {
      if (changedSeverity.checked === 'on') {
        telemetry.reportEntityRiskFiltered({
          entity: riskEntity,
          selectedSeverity: changedSeverity.risk,
        });
      }

      const newSelectedSeverities = newSelection
        .filter((item) => item.checked === 'on')
        .map((item) => item.risk);

      onSelect(newSelectedSeverities);
    },
    [onSelect, riskEntity, telemetry]
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
        <EuiSelectable
          aria-label={SEVERITY_FILTER_ARIA_LABEL}
          options={items}
          onChange={updateSeverityFilter}
          data-test-subj="risk-filter-selectable"
          renderOption={(item) => (
            <RiskScoreLevel data-test-subj={`risk-filter-item-${item.risk}`} severity={item.risk} />
          )}
        >
          {(list) => <div style={{ width: 150 }}>{list}</div>}
        </EuiSelectable>
      </EuiPopover>
    </EuiFilterGroup>
  );
};
