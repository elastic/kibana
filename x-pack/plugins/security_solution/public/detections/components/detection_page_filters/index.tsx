/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentProps } from 'react';
import React, { useState, useCallback } from 'react';
import type { Filter } from '@kbn/es-query';
import { isEqual } from 'lodash';
import { DEFAULT_DETECTION_PAGE_FILTERS } from '../../../../common/constants';
import { FilterGroup } from '../../../common/components/filter_group';

type FilterItemSetProps = Omit<ComponentProps<typeof FilterGroup>, 'initialControls'>;

const FilterItemSetComponent = (props: FilterItemSetProps) => {
  const { dataViewId, onFilterChange, ...restFilterItemGroupProps } = props;

  const [initialFilterControls] = useState(DEFAULT_DETECTION_PAGE_FILTERS);

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
