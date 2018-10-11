/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  // @ts-ignore typings for EuiSearchar not included in EUI
  EuiSearchBar,
} from '@elastic/eui';
import React from 'react';
import { FilterDefinition } from '../table';
import { AssignmentActionType } from './table';

interface TableSearchControlProps {
  filters?: FilterDefinition[];
  actionHandler(action: AssignmentActionType, payload?: any): void;
}

export const TableSearchControl = (props: TableSearchControlProps) => {
  const { actionHandler, filters } = props;
  return (
    <EuiSearchBar
      box={{ incremental: true }}
      filters={filters}
      onChange={(query: any) => actionHandler(AssignmentActionType.Search, query)}
    />
  );
};
