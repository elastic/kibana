/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem } from '@elastic/eui';
import React, { useCallback } from 'react';
import styled from 'styled-components';

import { ChartSettingsPopover } from '../../../../common/components/chart_settings_popover';
import { useChartSettingsPopoverConfiguration } from '../../../../common/components/chart_settings_popover/configurations/default';

interface Props {
  defaultStackByField: string;
  defaultStackByField1?: string;
  setShowCountsInChartLegend?: (value: boolean) => void;
  setStackBy: (value: string) => void;
  setStackByField1?: (stackBy: string | undefined) => void;
  showCountsInChartLegend?: boolean;
}

export const ChartOptionsFlexItem = styled(EuiFlexItem)`
  margin-left: ${({ theme }) => theme.eui.euiSizeS};
`;

const ChartContextMenuComponent = ({
  defaultStackByField,
  defaultStackByField1,
  setShowCountsInChartLegend,
  setStackBy,
  setStackByField1,
  showCountsInChartLegend,
}: Props) => {
  const onResetStackByFields = useCallback(() => {
    setStackBy(defaultStackByField);

    if (setStackByField1 != null) {
      setStackByField1(defaultStackByField1);
    }
  }, [defaultStackByField, defaultStackByField1, setStackBy, setStackByField1]);

  const {
    defaultInitialPanelId,
    defaultMenuItems,
    isPopoverOpen,
    riskMenuItems,
    setIsPopoverOpen,
  } = useChartSettingsPopoverConfiguration({
    onResetStackByFields,
    setShowCountsInChartLegend,
    setStackBy,
    setStackByField1,
    showCountsInChartLegend,
  });

  return (
    <ChartSettingsPopover
      initialPanelId={defaultInitialPanelId}
      isPopoverOpen={isPopoverOpen}
      panels={setStackByField1 != null ? riskMenuItems : defaultMenuItems}
      setIsPopoverOpen={setIsPopoverOpen}
    />
  );
};

ChartContextMenuComponent.displayName = 'ChartContextMenuComponent';

export const ChartContextMenu = React.memo(ChartContextMenuComponent);
