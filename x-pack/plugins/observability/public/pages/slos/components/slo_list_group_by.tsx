/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { EuiPanel, EuiSelectableOption, EuiText } from '@elastic/eui';

import { EuiSelectableOptionCheckedType } from '@elastic/eui/src/components/selectable/selectable_option';
import { SLOContextMenu, ContextMenuItem } from './slo_context_menu';
import type { Option } from './slo_context_menu';
import type { SearchState } from '../hooks/use_url_search_state';

export type GroupByField = 'ungrouped' | 'slo.tags' | 'status' | 'slo.indicator.type';
export interface Props {
  onStateChange: (newState: Partial<SearchState>) => void;
  groupBy: GroupByField;
}

export type Item<T> = EuiSelectableOption & {
  label: string;
  type: T;
  checked?: EuiSelectableOptionCheckedType;
};

export function SloGroupBy({ onStateChange, groupBy }: Props) {
  const [isGroupByPopoverOpen, setIsGroupByPopoverOpen] = useState(false);
  const handleChangeGroupBy = ({ value, label }: { value: GroupByField; label: string }) => {
    setGroupLabel(label);
    onStateChange({
      page: 0,
      groupBy: value,
    });
  };
  const groupByOptions: Option[] = [
    {
      label: i18n.translate('xpack.observability.slo.list.groupBy.sliIndicator', {
        defaultMessage: 'None',
      }),
      checked: groupBy === 'ungrouped',
      value: 'ungrouped',
      onClick: () => {
        handleChangeGroupBy({
          value: 'ungrouped',
          label: i18n.translate('xpack.observability.slo.list.groupBy.upgrouped', {
            defaultMessage: 'None',
          }),
        });
      },
    },
    {
      label: i18n.translate('xpack.observability.slo.list.groupBy.tags', {
        defaultMessage: 'Tags',
      }),
      checked: groupBy === 'slo.tags',
      value: 'slo.tags',
      onClick: () => {
        handleChangeGroupBy({
          value: 'slo.tags',
          label: i18n.translate('xpack.observability.slo.list.groupBy.tags', {
            defaultMessage: 'Tags',
          }),
        });
      },
    },
    {
      label: i18n.translate('xpack.observability.slo.list.groupBy.status', {
        defaultMessage: 'Status',
      }),
      checked: groupBy === 'status',
      value: 'status',
      onClick: () => {
        handleChangeGroupBy({
          value: 'status',
          label: i18n.translate('xpack.observability.slo.list.groupBy.status', {
            defaultMessage: 'Status',
          }),
        });
      },
    },
    {
      label: i18n.translate('xpack.observability.slo.list.groupBy.sliType', {
        defaultMessage: 'SLI type',
      }),
      checked: groupBy === 'slo.indicator.type',
      value: 'slo.indicator.type',
      onClick: () => {
        handleChangeGroupBy({
          value: 'slo.indicator.type',
          label: i18n.translate('xpack.observability.slo.list.groupBy.sliType', {
            defaultMessage: 'SLI type',
          }),
        });
      },
    },
  ];

  const [groupLabel, setGroupLabel] = useState(
    groupByOptions.find((option) => option.value === groupBy)?.label || 'None'
  );

  const items = [
    <EuiPanel paddingSize="s" hasShadow={false} key="group_title_panel">
      <EuiText size="xs">
        <h4>{GROUP_TITLE}</h4>
      </EuiText>
    </EuiPanel>,

    ...groupByOptions.map((option) => (
      <ContextMenuItem
        option={option}
        onClosePopover={() => setIsGroupByPopoverOpen(false)}
        key={option.value}
      />
    )),
  ];

  return (
    <SLOContextMenu
      items={items}
      id="groupBy"
      selected={groupLabel}
      isPopoverOpen={isGroupByPopoverOpen}
      setIsPopoverOpen={setIsGroupByPopoverOpen}
      label={GROUP_TITLE}
    />
  );
}

export const GROUP_TITLE = i18n.translate('xpack.observability.slo.groupPopover.group.title', {
  defaultMessage: 'Group by',
});
