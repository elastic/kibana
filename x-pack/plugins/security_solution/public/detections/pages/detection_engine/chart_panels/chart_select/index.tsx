/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import { EuiButton, EuiContextMenu, EuiIcon, EuiPopover } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';

import type { AlertViewSelection } from './helpers';
import { getButtonProperties, getContextMenuPanels } from './helpers';
import * as i18n from './translations';
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';
interface Props {
  alertViewSelection: AlertViewSelection;
  setAlertViewSelection: (alertViewSelection: AlertViewSelection) => void;
}

const ChartTypeIcon = styled(EuiIcon)`
  margin-right: ${({ theme }) => theme.eui.euiSizeS};
`;

const ChartSelectComponent: React.FC<Props> = ({
  alertViewSelection,
  setAlertViewSelection,
}: Props) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);
  const onButtonClick = useCallback(() => setIsPopoverOpen((currentVal) => !currentVal), []);

  const button = useMemo(() => {
    const buttonProperties = getButtonProperties(alertViewSelection);

    return (
      <EuiButton
        aria-label={i18n.SELECT_A_CHART_ARIA_LABEL}
        className="kbnToolbarButton"
        color="text"
        data-test-subj="chartSelect"
        iconSide="right"
        iconType="arrowDown"
        onClick={onButtonClick}
      >
        <ChartTypeIcon type={buttonProperties.icon} />
        <span>{buttonProperties.name}</span>
      </EuiButton>
    );
  }, [alertViewSelection, onButtonClick]);
  const isAlertsPageChartsEnabled = useIsExperimentalFeatureEnabled('alertsPageChartsEnabled');
  const panels: EuiContextMenuPanelDescriptor[] = useMemo(
    () =>
      getContextMenuPanels({
        alertViewSelection,
        closePopover,
        setAlertViewSelection,
        isAlertsPageChartsEnabled,
      }),
    [alertViewSelection, closePopover, setAlertViewSelection, isAlertsPageChartsEnabled]
  );

  return (
    <EuiPopover
      anchorPosition="downLeft"
      button={button}
      closePopover={closePopover}
      isOpen={isPopoverOpen}
      panelPaddingSize="none"
    >
      <EuiContextMenu initialPanelId={0} panels={panels} />
    </EuiPopover>
  );
};

ChartSelectComponent.displayName = 'ChartSelectComponent';

export const ChartSelect = React.memo(ChartSelectComponent);
