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
import { useDispatch } from 'react-redux';
import { HostRiskSeverity } from '../../../../common/search_strategy';
import * as i18n from './translations';
import { hostsActions, hostsModel, hostsSelectors } from '../../store';
import { SeverityCount } from '../../containers/kpi_hosts/risky_hosts';
import { HostRiskScore } from '../common/host_risk_score';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { State } from '../../../common/store';

interface SeverityItems {
  risk: HostRiskSeverity;
  count: number;
  checked?: FilterChecked;
}
export const SeverityFilterGroup: React.FC<{
  severityCount: SeverityCount;
  type: hostsModel.HostsType;
}> = ({ severityCount, type }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const dispatch = useDispatch();

  const onButtonClick = useCallback(() => {
    setIsPopoverOpen(!isPopoverOpen);
  }, [isPopoverOpen]);

  const closePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, []);

  const filterGroupPopoverId = useGeneratedHtmlId({
    prefix: 'filterGroupPopover',
  });
  const getHostRiskScoreFilterQuerySelector = useMemo(
    () => hostsSelectors.hostRiskScoreSeverityFilterSelector(),
    []
  );
  const severitySelectionRedux = useDeepEqualSelector((state: State) =>
    getHostRiskScoreFilterQuerySelector(state, type)
  );

  const items: SeverityItems[] = useMemo(() => {
    const checked: FilterChecked = 'on';
    return (Object.keys(severityCount) as HostRiskSeverity[]).map((k) => ({
      risk: k,
      count: severityCount[k],
      checked: severitySelectionRedux.includes(k) ? checked : undefined,
    }));
  }, [severityCount, severitySelectionRedux]);

  const updateSeverityFilter = useCallback(
    (selectedSeverity: HostRiskSeverity) => {
      const currentSelection = severitySelectionRedux ?? [];
      const newSelection = currentSelection.includes(selectedSeverity)
        ? currentSelection.filter((s) => s !== selectedSeverity)
        : [...currentSelection, selectedSeverity];
      dispatch(
        hostsActions.updateHostRiskScoreSeverityFilter({
          severitySelection: newSelection,
          hostsType: type,
        })
      );
    },
    [dispatch, severitySelectionRedux, type]
  );

  const totalActiveHosts = useMemo(
    () => items.reduce((total, item) => (item.checked === 'on' ? total + item.count : total), 0),
    [items]
  );

  const button = useMemo(
    () => (
      <EuiFilterButton
        hasActiveFilters={!!items.find((item) => item.checked === 'on')}
        iconType="arrowDown"
        isSelected={isPopoverOpen}
        numActiveFilters={totalActiveHosts}
        onClick={onButtonClick}
      >
        {i18n.HOST_RISK}
      </EuiFilterButton>
    ),
    [isPopoverOpen, items, onButtonClick, totalActiveHosts]
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
              checked={item.checked}
              key={index + item.risk}
              onClick={() => updateSeverityFilter(item.risk)}
            >
              <HostRiskScore severity={item.risk} />
            </EuiFilterSelectItem>
          ))}
        </div>
      </EuiPopover>
    </EuiFilterGroup>
  );
};
