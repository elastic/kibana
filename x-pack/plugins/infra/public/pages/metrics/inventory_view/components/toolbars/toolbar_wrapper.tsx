/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexItem } from '@elastic/eui';
import { fieldToName } from '../../lib/field_to_display_name';
import { useSourceContext } from '../../../../../containers/source';
import { useWaffleOptionsContext } from '../../hooks/use_waffle_options';
import { WaffleInventorySwitcher } from '../waffle/waffle_inventory_switcher';
import { ToolbarProps } from './toolbar';

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
  const { createDerivedIndexPattern } = useSourceContext();
  return (
    <>
      <EuiFlexItem grow={false}>
        <WaffleInventorySwitcher />
      </EuiFlexItem>
      {props.children({
        createDerivedIndexPattern,
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
    </>
  );
};

export const toGroupByOpt = (field: string) => ({
  text: fieldToName(field),
  field,
});
