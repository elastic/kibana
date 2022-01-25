/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  EuiFilterButton,
  EuiFilterGroup,
  EuiFilterSelectItem,
  EuiLoadingChart,
  EuiPopover,
  EuiSpacer,
  FilterChecked,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { useDispatch } from 'react-redux';
import { HostRiskSeverity } from '../../../../common/search_strategy';
import * as i18n from './translations';
import { hostsActions, hostsModel } from '../../store';
import { SeverityCount } from '../../containers/kpi_hosts/risky_hosts';
import { HostRiskScore } from '../common/host_risk_score';

interface SeverityItems {
  risk: HostRiskSeverity;
  count: number;
  checked?: FilterChecked;
}
export const SeverityFilterGroup: React.FC<{
  loading: boolean;
  severityCount: SeverityCount;
  type: hostsModel.HostsType;
}> = ({ loading, severityCount, type }) => {
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

  const [items, setItems] = useState<SeverityItems[]>(
    (Object.keys(severityCount) as HostRiskSeverity[]).map((k) => ({
      risk: k as HostRiskSeverity,
      count: severityCount[k],
    }))
  );

  const filterQuery = useMemo(
    () =>
      items.reduce(
        (acc: HostRiskSeverity[], item) => (item.checked === 'on' ? [...acc, item.risk] : acc),
        []
      ),
    [items]
  );

  useEffect(() => {
    dispatch(
      hostsActions.updateRiskScoreBetterFilterQuery({
        filterQuery:
          filterQuery.length > 0
            ? {
                query: {
                  bool: {
                    should: filterQuery.map((query) => ({
                      match_phrase: {
                        'risk.keyword': {
                          query,
                        },
                      },
                    })),
                  },
                },
                meta: {
                  alias: null,
                  disabled: false,
                  negate: false,
                },
              }
            : undefined,
        hostsType: type,
      })
    );
  }, [filterQuery, dispatch, type]);

  useEffect(() => {
    setItems((prevItems) =>
      (Object.keys(severityCount) as HostRiskSeverity[]).map((k) => ({
        risk: k as HostRiskSeverity,
        count: severityCount[k],
        checked: prevItems.find((v) => v.risk === k)?.checked,
      }))
    );
  }, [severityCount]);

  const updateItem = useCallback(
    (index: number) => {
      if (!items[index]) {
        return;
      }

      const newItems = [...items];

      switch (newItems[index].checked) {
        case 'on':
          newItems[index].checked = undefined;
          break;

        case 'off':
          newItems[index].checked = undefined;
          break;

        default:
          newItems[index].checked = 'on';
      }

      setItems(newItems);
    },
    [items]
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
          {!loading &&
            items.map((item, index) => (
              <EuiFilterSelectItem
                checked={item.checked}
                key={index}
                onClick={() => updateItem(index)}
              >
                <HostRiskScore severity={item.risk} />
              </EuiFilterSelectItem>
            ))}
          {loading && (
            <div className="euiFilterSelect__note">
              <div className="euiFilterSelect__noteContent">
                <EuiLoadingChart size="m" />
                <EuiSpacer size="xs" />
                <p>{`Loading filters`}</p>
              </div>
            </div>
          )}
        </div>
      </EuiPopover>
    </EuiFilterGroup>
  );
};
