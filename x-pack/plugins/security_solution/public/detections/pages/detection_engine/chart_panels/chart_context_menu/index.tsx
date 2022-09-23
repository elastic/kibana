/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { noop } from 'lodash/fp';
import React, { useCallback } from 'react';

import { ChartSettingsPopover } from '../../../../../common/components/chart_settings_popover';
import { useChartSettingsPopoverConfiguration } from '../../../../../common/components/chart_settings_popover/configurations/default';

interface Props {
  defaultStackByField: string;
  defaultStackByField1?: string;
  queryId: string;
  setStackBy: (value: string) => void;
  setStackByField1?: (stackBy: string | undefined) => void;
  onReset?: () => void;
}

const ChartContextMenuComponent: React.FC<Props> = ({
  defaultStackByField,
  defaultStackByField1,
  onReset = noop,
  queryId,
  setStackBy,
  setStackByField1,
}: Props) => {
  const onResetStackByFields = useCallback(() => {
    onReset();

    setStackBy(defaultStackByField);

    if (setStackByField1 != null) {
      setStackByField1(defaultStackByField1);
    }
  }, [defaultStackByField, defaultStackByField1, onReset, setStackBy, setStackByField1]);

  const { defaultInitialPanelId, defaultMenuItems, isPopoverOpen, setIsPopoverOpen } =
    useChartSettingsPopoverConfiguration({
      onResetStackByFields,
      queryId,
    });

  return (
    <ChartSettingsPopover
      initialPanelId={defaultInitialPanelId}
      isPopoverOpen={isPopoverOpen}
      panels={defaultMenuItems}
      setIsPopoverOpen={setIsPopoverOpen}
    />
  );
};

ChartContextMenuComponent.displayName = 'ChartContextMenuComponent';

export const ChartContextMenu = React.memo(ChartContextMenuComponent);
