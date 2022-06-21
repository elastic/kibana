/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { TreeNav } from './tree_nav';
import { SessionList } from './session_list';

export const TreeViewPanel = ({ indexPattern, globalFilter, groupedBy }: any) => {
  return (
    <EuiFlexGroup gutterSize="none">
      <EuiFlexItem style={{ width: 316 }} grow={false}>
        <TreeNav indexPattern={indexPattern} globalFilter={globalFilter} />
      </EuiFlexItem>
      <EuiFlexItem>
        <SessionList />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
