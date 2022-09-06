/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { useSourceContext } from '../../../../../containers/metrics_source';
import { useDerivedDataView } from '../../../../../hooks/use_derived_data_view';
import { useWaffleOptionsContext } from '../../hooks/use_waffle_options';
import { fieldToName } from '../../lib/field_to_display_name';
import { WaffleInventorySwitcher } from '../waffle/waffle_inventory_switcher';
import { ToolbarProps } from './types';

interface Props {
  children: (props: Omit<ToolbarProps, 'accounts' | 'regions'>) => React.ReactElement;
}

export const ToolbarWrapper = (props: Props) => {
  const {
    changeMetric,
    changeGroupBy,
    changeCustomOptions,
    changeAccount,
    changeRegion,
    changeSort,
    customOptions,
    groupBy,
    metric,
    nodeType,
    accountId,
    view,
    region,
    legend,
    sort,
    customMetrics,
    changeCustomMetrics,
  } = useWaffleOptionsContext();
  const { source } = useSourceContext();
  const derivedDataView = useDerivedDataView(source?.configuration.metricAlias);

  return (
    <EuiFlexGroup responsive={false} wrap gutterSize="m">
      <EuiFlexItem grow={false}>
        <WaffleInventorySwitcher />
      </EuiFlexItem>
      {props.children({
        derivedDataView,
        changeMetric,
        changeGroupBy,
        changeAccount,
        changeRegion,
        changeCustomOptions,
        changeSort,
        customOptions,
        groupBy,
        sort,
        view,
        metric,
        nodeType,
        region,
        accountId,
        legend,
        customMetrics,
        changeCustomMetrics,
      })}
    </EuiFlexGroup>
  );
};

export const toGroupByOpt = (field: string) => ({
  text: fieldToName(field),
  field,
});
