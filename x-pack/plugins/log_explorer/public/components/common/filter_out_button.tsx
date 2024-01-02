/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import {
  createFilter,
  isEmptyFilterValue,
} from '@kbn/cell-actions/src/actions/filter/create_filter';
import { filterOutText, actionFilterOutText } from './translations';
import { useVirtualColumnServiceContext } from '../../hooks/use_virtual_column_services';

export const FilterOutButton = ({ property, value }: { property: string; value: string }) => {
  const ariaFilterOutText = actionFilterOutText(value);
  const serviceContext = useVirtualColumnServiceContext();
  const filterManager = serviceContext?.data.query.filterManager;

  const onFilterOutAction = () => {
    if (filterManager != null) {
      const filter = createFilter({
        key: property,
        value: [value],
        negate: !isEmptyFilterValue([value]),
      });
      filterManager.addFilters(filter);
    }
  };

  return (
    <EuiFlexItem key="removeFromFilterAction">
      <EuiButtonEmpty
        size="s"
        iconType="minusInCircle"
        aria-label={ariaFilterOutText}
        onClick={onFilterOutAction}
        data-test-subj={`dataTableCellAction_removeFromFilterAction_${property}_${value.replace(
          / +/g,
          ''
        )}`}
      >
        {filterOutText}
      </EuiButtonEmpty>
    </EuiFlexItem>
  );
};
