/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiIcon, EuiPanel, EuiPanelProps, EuiText, EuiToolTip } from '@elastic/eui';
import React from 'react';
import { SelectorList, SortOrder } from './selector_list';
import { nameColumnLabel, openDiscoverLabel } from '../constants';
import {
  DataSourceSelectorSearchHandler,
  DataSourceSelectorSearchParams,
  DataViewTreeItem,
} from '../types';

type DataViewListProps = {
  dataViews: DataViewTreeItem[];
  statusPrompt: React.ReactNode;
  onSortByName: DataSourceSelectorSearchHandler;
  search: DataSourceSelectorSearchParams;
} & EuiPanelProps;

export function DataViewList({
  children,
  dataViews,
  onSortByName,
  search,
  statusPrompt,
  ...props
}: DataViewListProps) {
  const shouldDisplayPrompt = Boolean(!dataViews || dataViews.length === 0);

  const handleNameSort = (sortOrder: SortOrder) => onSortByName({ ...search, sortOrder });

  return (
    <EuiPanel
      {...props}
      data-test-subj="dataSourceSelectorDataViewsList"
      paddingSize="none"
      hasShadow={false}
    >
      {children}
      <SelectorList>
        <SelectorList.Header>
          <SelectorList.SortableColumn
            onSort={handleNameSort}
            sortOrder={search.sortOrder}
            data-test-subj="dataSourceSelectorDataViewNameHeader"
          >
            <EuiText size="xs">
              <strong>{nameColumnLabel}</strong>
            </EuiText>
          </SelectorList.SortableColumn>
        </SelectorList.Header>
        {dataViews.map((dataView) => (
          <DataViewRow {...dataView} />
        ))}
        {shouldDisplayPrompt && statusPrompt}
      </SelectorList>
    </EuiPanel>
  );
}

const DataViewRow = ({ name, isAllowed, disabled, ...props }: DataViewTreeItem) => {
  return (
    <SelectorList.Row disabled={disabled}>
      <SelectorList.Column
        component="button"
        // @ts-expect-error This is an issue with EuiFlexItem not correctly inferring the props of the passed component. https://github.com/elastic/eui/issues/7612
        disabled={disabled}
        {...props}
      >
        <DataViewName name={name} isAllowed={isAllowed} />
      </SelectorList.Column>
    </SelectorList.Row>
  );
};

const DataViewName = ({ name, isAllowed }: Pick<DataViewTreeItem, 'name' | 'isAllowed'>) => {
  if (isAllowed) {
    return <EuiText size="s">{name}</EuiText>;
  }

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      <EuiText size="s">{name}</EuiText>
      <EuiToolTip content={openDiscoverLabel}>
        <EuiIcon type="popout" color="subdued" />
      </EuiToolTip>
    </EuiFlexGroup>
  );
};
