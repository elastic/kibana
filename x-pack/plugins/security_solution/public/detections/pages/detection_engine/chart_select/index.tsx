/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiPopover,
  EuiSelectable,
  EuiSelectableOption,
  EuiTextColor,
  EuiTitle,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';

import { TREND_ID, RISK_ID, updateChartVisiblityOnSelection, AlertViewSelection } from './helpers';
import * as i18n from './translations';

const ContainerEuiSelectable = styled.div`
  width: 300px;
  .euiSelectableListItem__text {
    white-space: pre-wrap !important;
    line-height: normal;
  }
`;

interface Props {
  alertViewSelection: AlertViewSelection;
  setAlertViewSelection: (alertViewSelection: AlertViewSelection) => void;
  setShowCountTable: (show: boolean) => void;
  setShowRiskChart: (show: boolean) => void;
  setShowTrendChart: (show: boolean) => void;
}

const ChartSelectComponent = ({
  alertViewSelection,
  setAlertViewSelection,
  setShowCountTable,
  setShowRiskChart,
  setShowTrendChart,
}: Props) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);
  const onButtonClick = useCallback(() => setIsPopoverOpen((currentVal) => !currentVal), []);

  const button = useMemo(
    () => (
      <EuiButtonEmpty
        iconType="arrowDown"
        iconSide="right"
        iconSize="s"
        onClick={onButtonClick}
        size="xs"
        flush="both"
        style={{ fontWeight: 'normal' }}
      >
        {alertViewSelection === TREND_ID ? i18n.TREND_VIEW : i18n.ALERTS_BY_RISK_SCORE_VIEW}
      </EuiButtonEmpty>
    ),
    [alertViewSelection, onButtonClick]
  );

  const listProps = useMemo(
    () => ({
      rowHeight: 80,
      showIcons: true,
    }),
    []
  );

  const onChange = useCallback(
    (opts: EuiSelectableOption[]) => {
      const selected = opts.filter((i) => i.checked === 'on');
      if (selected.length > 0) {
        const newView: AlertViewSelection = (selected[0]?.key as AlertViewSelection) ?? TREND_ID;

        updateChartVisiblityOnSelection({
          alertViewSelection: newView,
          setAlertViewSelection,
          setShowCountTable,
          setShowRiskChart,
          setShowTrendChart,
        });
      }
      setIsPopoverOpen(false);
    },
    [setAlertViewSelection, setShowCountTable, setShowRiskChart, setShowTrendChart]
  );

  const options: EuiSelectableOption[] = useMemo(
    () => [
      {
        checked: alertViewSelection === TREND_ID ? 'on' : undefined,
        key: TREND_ID,
        label: i18n.TREND_VIEW,
        meta: [
          {
            text: i18n.TREND_VIEW_DESCRIPTION,
          },
        ],
      },
      {
        checked: alertViewSelection === RISK_ID ? 'on' : undefined,
        key: RISK_ID,
        label: i18n.ALERTS_BY_RISK_SCORE_VIEW,
        meta: [
          {
            text: i18n.ALERTS_BY_RISK_SCORE_VIEW_DESCRIPTION,
          },
        ],
      },
    ],
    [alertViewSelection]
  );

  const renderOption = useCallback((option) => {
    return (
      <>
        <EuiTitle size="xxs">
          <h6>{option.label}</h6>
        </EuiTitle>
        <EuiTextColor color="subdued">
          <small>{option.meta[0].text}</small>
        </EuiTextColor>
      </>
    );
  }, []);

  return (
    <EuiPopover
      button={button}
      closePopover={closePopover}
      isOpen={isPopoverOpen}
      panelPaddingSize="none"
    >
      <ContainerEuiSelectable>
        <EuiSelectable
          height={160}
          listProps={listProps}
          onChange={onChange}
          options={options}
          renderOption={renderOption}
          searchable={false}
          singleSelection={true}
        >
          {(list) => list}
        </EuiSelectable>
      </ContainerEuiSelectable>
    </EuiPopover>
  );
};

ChartSelectComponent.displayName = 'ChartSelectComponent';

export const ChartSelect = React.memo(ChartSelectComponent);
