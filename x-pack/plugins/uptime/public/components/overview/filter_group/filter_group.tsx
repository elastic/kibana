/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiFilterGroup } from '@elastic/eui';
import styled from 'styled-components';
import { useRouteMatch } from 'react-router-dom';
import { FilterPopoverProps, FilterPopover } from './filter_popover';
import { OverviewFilters } from '../../../../common/runtime_types/overview_filters';
import { filterLabels } from './translations';
import { useFilterUpdate } from '../../../hooks/use_filter_update';
import { MONITOR_ROUTE } from '../../../../common/constants';
import { useSelectedFilters } from '../../../hooks/use_selected_filters';

interface Props {
  loading: boolean;
  overviewFilters: OverviewFilters;
}

const Container = styled(EuiFilterGroup)`
  margin-bottom: 10px;
`;

function isDisabled<T>(array?: T[]) {
  return array ? array.length === 0 : true;
}

export const FilterGroupComponent: React.FC<Props> = ({ overviewFilters, loading }) => {
  const { locations, ports, schemes, tags } = overviewFilters;

  const [updatedFieldValues, setUpdatedFieldValues] = useState<{
    fieldName: string;
    values: string[];
  }>({ fieldName: '', values: [] });

  useFilterUpdate(updatedFieldValues.fieldName, updatedFieldValues.values);

  const { selectedLocations, selectedPorts, selectedSchemes, selectedTags } = useSelectedFilters();

  const onFilterFieldChange = (fieldName: string, values: string[]) => {
    setUpdatedFieldValues({ fieldName, values });
  };

  const isMonitorPage = useRouteMatch(MONITOR_ROUTE);

  const filterPopoverProps: FilterPopoverProps[] = [
    {
      loading,
      onFilterFieldChange,
      fieldName: 'observer.geo.name',
      id: 'location',
      items: locations || [],
      selectedItems: selectedLocations,
      title: filterLabels.LOCATION,
    },
    // on monitor page we only display location filter in ping list
    ...(!isMonitorPage
      ? [
          {
            loading,
            onFilterFieldChange,
            fieldName: 'url.port',
            id: 'port',
            disabled: isDisabled(ports),
            items: ports?.map((p: number) => p.toString()) ?? [],
            selectedItems: selectedPorts,
            title: filterLabels.PORT,
          },
          {
            loading,
            onFilterFieldChange,
            fieldName: 'monitor.type',
            id: 'scheme',
            disabled: isDisabled(schemes),
            items: schemes ?? [],
            selectedItems: selectedSchemes,
            title: filterLabels.SCHEME,
          },
          {
            loading,
            onFilterFieldChange,
            fieldName: 'tags',
            id: 'tags',
            disabled: isDisabled(tags),
            items: tags ?? [],
            selectedItems: selectedTags,
            title: filterLabels.TAG,
          },
        ]
      : []),
  ];

  return (
    <Container>
      {filterPopoverProps.map((item) => (
        <FilterPopover key={item.id} {...item} />
      ))}
    </Container>
  );
};
