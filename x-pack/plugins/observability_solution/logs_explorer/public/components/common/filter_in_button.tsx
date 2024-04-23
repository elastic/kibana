/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { generateFilters } from '@kbn/data-plugin/public';
import { filterForText, actionFilterForText } from './translations';
import { useVirtualColumnServiceContext } from '../../hooks/use_virtual_column_services';

export const FilterInButton = ({ property, value }: { property: string; value: string }) => {
  const ariaFilterForText = actionFilterForText(value);
  const serviceContext = useVirtualColumnServiceContext();
  const filterManager = serviceContext?.data.query.filterManager;
  const dataView = serviceContext.dataView;

  const onFilterForAction = () => {
    if (filterManager != null) {
      const filter = generateFilters(filterManager, property, [value], '+', dataView);
      filterManager.addFilters(filter);
    }
  };

  return (
    <EuiFlexItem key="addToFilterAction">
      <EuiButtonEmpty
        size="s"
        iconType="plusInCircle"
        aria-label={ariaFilterForText}
        onClick={onFilterForAction}
        data-test-subj={`dataTableCellAction_addToFilterAction_${property}`}
      >
        {filterForText}
      </EuiButtonEmpty>
    </EuiFlexItem>
  );
};
