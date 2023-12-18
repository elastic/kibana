/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverTitle,
  EuiSelectable,
  EuiSelectableOption,
  EuiFilterGroup,
  EuiFilterButton,
} from '@elastic/eui';
import { EuiSelectableOptionCheckedType } from '@elastic/eui/src/components/selectable/selectable_option';
import { SearchState } from '../hooks/use_url_search_state';

export type GroupByField = 'ungrouped' | 'sli_indicator' | 'status' | 'tags';
export interface Props {
  loading: boolean;
  onChangeGroupBy: (groupBy: GroupByField) => void;
  initialState: SearchState;
}

export type Item<T> = EuiSelectableOption & {
  label: string;
  type: T;
  checked?: EuiSelectableOptionCheckedType;
};

const GROUP_BY_OPTIONS: Array<Item<GroupByField>> = [
  {
    label: i18n.translate('xpack.observability.slo.list.groupBy.sliIndicator', {
      defaultMessage: 'Ungrouped',
    }),
    type: 'ungrouped',
  },
  {
    label: i18n.translate('xpack.observability.slo.list.groupBy.sliIndicator', {
      defaultMessage: 'SLI Indicator',
    }),
    type: 'sli_indicator',
  },
  {
    label: i18n.translate('xpack.observability.slo.list.sortBy.status', {
      defaultMessage: 'Status',
    }),
    type: 'status',
  },
  {
    label: i18n.translate('xpack.observability.slo.list.sortBy.tags', {
      defaultMessage: 'Tags',
    }),
    type: 'tags',
  },
  // TODO add group_by_instanceId
];
export function SloGroupBy({ loading, onChangeGroupBy, initialState }: Props) {
  const [isGroupByPopoverOpen, setGroupByPopoverOpen] = useState(false);
  const [groupByOptions, setGroupByOptions] = useState<Array<Item<GroupByField>>>(
    GROUP_BY_OPTIONS.map((option) => ({
      ...option,
      checked: option.type === initialState.groupBy ? 'on' : undefined,
    }))
  );

  const selectedGroupBy = groupByOptions.find((option) => option.checked === 'on');
  const handleToggleGroupByButton = () => setGroupByPopoverOpen(!isGroupByPopoverOpen);

  const handleChangeGroupBy = (newOptions: Array<Item<GroupByField>>) => {
    setGroupByOptions(newOptions);
    setGroupByPopoverOpen(false);
    onChangeGroupBy(newOptions.find((o) => o.checked)!.type);
  };
  return (
    <EuiFlexItem grow={false}>
      <EuiFlexGroup direction="row" gutterSize="s" responsive>
        <EuiFlexItem style={{ maxWidth: 250 }}>
          <EuiFilterGroup>
            <EuiPopover
              button={
                <EuiFilterButton
                  disabled={loading}
                  iconType="arrowDown"
                  onClick={handleToggleGroupByButton}
                  isSelected={isGroupByPopoverOpen}
                >
                  {i18n.translate('xpack.observability.slo.list.sortByType', {
                    defaultMessage: 'Group by {type}',
                    values: { type: selectedGroupBy?.label.toLowerCase() ?? '' },
                  })}
                </EuiFilterButton>
              }
              isOpen={isGroupByPopoverOpen}
              closePopover={handleToggleGroupByButton}
              panelPaddingSize="none"
              anchorPosition="downCenter"
            >
              <div style={{ width: 250 }}>
                <EuiPopoverTitle paddingSize="s">
                  {i18n.translate('xpack.observability.slo.list.sortBy', {
                    defaultMessage: 'Group by',
                  })}
                </EuiPopoverTitle>
                <EuiSelectable<Item<GroupByField>>
                  singleSelection="always"
                  options={groupByOptions}
                  onChange={handleChangeGroupBy}
                  isLoading={loading}
                >
                  {(list) => list}
                </EuiSelectable>
              </div>
            </EuiPopover>
          </EuiFilterGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
}
