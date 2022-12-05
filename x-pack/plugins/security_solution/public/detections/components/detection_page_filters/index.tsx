/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import type { Filter } from '@kbn/es-query';
import { isEqual } from 'lodash';
import type {
  FilterGroupProps,
  FilterItemObj,
} from '../../../common/components/page_filters/types';
import { FilterGroup } from '../../../common/components/page_filters/filter_group';

type FilterItemSetProps = Omit<FilterGroupProps, 'initialControls'>;

const defaultInitialControls: FilterItemObj[] = [
  {
    title: 'Status',
    fieldName: 'kibana.alert.workflow_status',
    selectedOptions: ['open'],
  },
  {
    title: 'Severity',
    fieldName: 'kibana.alert.severity',
    selectedOptions: [],
  },
  {
    title: 'User',
    fieldName: 'user.name',
  },
  {
    title: 'Host',
    fieldName: 'host.name',
  },
];

const FilterItemSetComponent = (props: FilterItemSetProps) => {
  const { dataViewId, onFilterChange, ...restFilterItemGroupProps } = props;

  const [initialFilterControls] = useState(defaultInitialControls);

  const filterChangesHandler = useCallback(
    (newFilters: Filter[]) => {
      if (!onFilterChange) {
        return;
      }
      const updatedFilters = newFilters.map((filter) => {
        return {
          ...filter,
          meta: {
            ...filter.meta,
            disabled: false,
          },
        };
      });
      onFilterChange(updatedFilters);
    },
    [onFilterChange]
  );
  return (
    <FilterGroup
      dataViewId={dataViewId}
      onFilterChange={filterChangesHandler}
      initialControls={initialFilterControls}
      {...restFilterItemGroupProps}
    />
  );
};

const arePropsEqual = (prevProps: FilterItemSetProps, newProps: FilterItemSetProps) => {
  const _isEqual = isEqual(prevProps, newProps);
  return _isEqual;
};

export const DetectionPageFilterSet = React.memo(FilterItemSetComponent, arePropsEqual);
