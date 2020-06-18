/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import { useLocalUIFilters } from '../../../hooks/useLocalUIFilters';
import { PROJECTION } from '../../../../common/projections/typings';
import { LocalUIFilters } from '../../shared/LocalUIFilters';
import { BreakdownGroup } from './BreakdownGroup';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { BreakdownItem } from '../../../../typings/ui_filters';

interface Props {
  selectedBreakdowns: BreakdownItem[];
  onBreakdownChange: (values: BreakdownItem[]) => void;
}

export const BreakdownFilter = ({
  selectedBreakdowns,
  onBreakdownChange,
}: Props) => {
  const { uiFilters, urlParams } = useUrlParams();

  const { start, end } = urlParams;

  const localUIFiltersConfig = useMemo(() => {
    const config: React.ComponentProps<typeof LocalUIFilters> = {
      filterNames: ['location', 'device', 'os', 'browser'],
      projection: PROJECTION.RUM_OVERVIEW,
      params: { uiFilters: JSON.stringify(uiFilters), start, end },
    };

    return config;
  }, [uiFilters, start, end]);

  const { filters } = useLocalUIFilters(localUIFiltersConfig);

  const newItems: BreakdownItem[] = [];

  filters.forEach(({ options, fieldName }) => {
    options.forEach((item) => {
      if (
        selectedBreakdowns?.find(
          ({ name, type }) => item.name === name && fieldName === type
        )
      )
        newItems.push({ ...item, type: fieldName, selected: true });
      else newItems.push({ ...item, type: fieldName, selected: false });
    });
  });

  const sItems = newItems.sort((a, b) => b.count - a.count);

  const onChange = (selValues: BreakdownItem[]) => {
    onBreakdownChange(selValues);
  };

  return (
    <BreakdownGroup
      fieldName={fieldName}
      id={fieldName}
      items={sItems}
      loading={false}
      onChange={onChange}
      title={'Breakdown'}
    />
  );
};
