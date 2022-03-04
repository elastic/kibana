/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { noop } from 'lodash/fp';
import { EuiContextMenuPanelDescriptor, EuiContextMenuPanelItemDescriptor } from '@elastic/eui';
import { useMemo, useState } from 'react';

import * as i18n from './translations';

const defaultInitialPanelId = 'default-initial-panel';

interface Props {
  defaultStackByField1?: string;
  onResetStackByFields: () => void;
  setShowCountsInChartLegend?: (value: boolean) => void;
  setStackBy: (value: string) => void;
  setStackByField1?: (stackBy: string | undefined) => void;
  showCountsInChartLegend?: boolean;
}

export const useChartSettingsPopoverConfiguration = ({
  onResetStackByFields,
  setShowCountsInChartLegend,
  setStackBy,
  setStackByField1 = noop,
  showCountsInChartLegend,
}: Props) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const showCountsInChartLegendMenuItem: EuiContextMenuPanelItemDescriptor[] = useMemo(
    () =>
      setShowCountsInChartLegend != null
        ? [
            {
              name: showCountsInChartLegend
                ? i18n.HIDE_COUNTS_IN_LEGEND
                : i18n.SHOW_COUNTS_IN_LEGEND,
              icon: 'number',
              onClick: () => {
                setIsPopoverOpen(false);
                setShowCountsInChartLegend(!showCountsInChartLegend);
              },
            },
          ]
        : [],
    [setShowCountsInChartLegend, showCountsInChartLegend]
  );

  const defaultMenuItems: EuiContextMenuPanelDescriptor[] = useMemo(
    () => [
      {
        id: defaultInitialPanelId,
        items: [
          {
            name: i18n.RESET_STACK_BY_FIELD,
            icon: 'kqlField',
            onClick: () => {
              setIsPopoverOpen(false);
              onResetStackByFields();
            },
          },
          ...showCountsInChartLegendMenuItem,
        ],
        title: i18n.OPTIONS,
      },
    ],
    [onResetStackByFields, showCountsInChartLegendMenuItem]
  );

  const riskMenuItems: EuiContextMenuPanelDescriptor[] = useMemo(
    () => [
      {
        id: defaultInitialPanelId,
        items: [
          {
            name: i18n.RESET_GROUP_BY_FIELDS,
            icon: 'kqlField',
            onClick: () => {
              setIsPopoverOpen(false);
              onResetStackByFields();
            },
          },
          {
            name: i18n.GROUP_BY_RULE_AND_USER_NAME,
            icon: 'kqlField',
            onClick: () => {
              setIsPopoverOpen(false);
              setStackBy('kibana.alert.rule.name');
              setStackByField1('user.name');
            },
          },
          {
            name: i18n.GROUP_BY_PARENT_AND_CHILD_PROCESS,
            icon: 'kqlField',
            onClick: () => {
              setIsPopoverOpen(false);
              setStackBy('process.parent.name');
              setStackByField1('process.name');
            },
          },
          {
            name: i18n.GROUP_BY_PROCESS_AND_FILE_NAME,
            icon: 'kqlField',
            onClick: () => {
              setIsPopoverOpen(false);
              setStackBy('process.name');
              setStackByField1('file.name');
            },
          },
          {
            name: i18n.GROUP_BY_HOST_AND_USER_NAME,
            icon: 'kqlField',
            onClick: () => {
              setIsPopoverOpen(false);
              setStackBy('host.name');
              setStackByField1('user.name');
            },
          },
        ],
        title: i18n.OPTIONS,
      },
    ],
    [onResetStackByFields, setStackBy, setStackByField1]
  );

  return {
    defaultInitialPanelId,
    defaultMenuItems,
    isPopoverOpen,
    riskMenuItems,
    setIsPopoverOpen,
  };
};
