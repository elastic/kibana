/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useState } from 'react';
import { FilterPopover } from '../../../../../uptime/public';
import { useLocalUIFilters } from '../../../hooks/useLocalUIFilters';
import { PROJECTION } from '../../../../common/projections/typings';
import { LocalUIFilters } from '../../shared/LocalUIFilters';

interface Props {
  fieldName: string;
  onBreakdownChange: (values: Map<string, string[]>) => void;
}

export const BreakdownFilter = ({ fieldName, onBreakdownChange }: Props) => {
  const [selectedFilters, setSelectedFilters] = useState<Set<string>>(
    new Set([])
  );

  const localUIFiltersConfig = useMemo(() => {
    const config: React.ComponentProps<typeof LocalUIFilters> = {
      filterNames: ['transactionUrl', 'location', 'device', 'os', 'browser'],
      projection: PROJECTION.RUM_OVERVIEW,
      params: { uiFilters: '{}' },
    };

    return config;
  }, []);

  const { filters } = useLocalUIFilters(localUIFiltersConfig);

  const items: string[] = [];

  filters.forEach(({ options }) => {
    options.forEach(({ name }) => {
      items.push(name);
    });
  });

  const onFilterFieldChange = (field: string, selValues: string[]) => {
    setSelectedFilters((prevState) => {
      return new Set<string>(selValues);
    });

    const newValues: Map<string, string[]> = new Map();

    filters.forEach(({ options, fieldName: fieldLabel }) => {
      const selItems: string[] = [];

      options.forEach(({ name }) => {
        if (selValues.includes(name)) {
          selItems.push(name);
        }
      });

      if (selItems.length > 0) {
        newValues.set(fieldLabel, selItems);
      }
    });
    onBreakdownChange(newValues);
  };

  return (
    <FilterPopover
      fieldName={fieldName}
      id={fieldName}
      items={items}
      loading={false}
      onFilterFieldChange={onFilterFieldChange}
      selectedItems={[]}
      title={'Breakdown'}
      size={'s'}
    />
  );
};
