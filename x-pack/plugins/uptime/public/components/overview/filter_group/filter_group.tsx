/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiFilterGroup } from '@elastic/eui';
import styled from 'styled-components';
import { FilterPopoverProps, FilterPopover } from './filter_popover';
import { OverviewFilters } from '../../../../common/runtime_types/overview_filters';
import { filterLabels } from './translations';
import { useFilterUpdate } from '../../../hooks/use_filter_update';

interface PresentationalComponentProps {
  loading: boolean;
  overviewFilters: OverviewFilters;
}

const Container = styled(EuiFilterGroup)`
  margin-bottom: 10px;
`;

export const FilterGroupComponent: React.FC<PresentationalComponentProps> = ({
  overviewFilters,
  loading,
}) => {
  const { locations, ports, schemes, tags } = overviewFilters;

  const [updatedFieldValues, setUpdatedFieldValues] = useState<{
    fieldName: string;
    values: string[];
  }>({ fieldName: '', values: [] });

  const { selectedLocations, selectedPorts, selectedSchemes, selectedTags } = useFilterUpdate(
    updatedFieldValues.fieldName,
    updatedFieldValues.values
  );

  const onFilterFieldChange = (fieldName: string, values: string[]) => {
    setUpdatedFieldValues({ fieldName, values });
  };

  const filterPopoverProps: FilterPopoverProps[] = [
    {
      loading,
      onFilterFieldChange,
      fieldName: 'observer.geo.name',
      id: 'location',
      items: locations,
      selectedItems: selectedLocations,
      title: filterLabels.LOCATION,
    },
    {
      loading,
      onFilterFieldChange,
      fieldName: 'url.port',
      id: 'port',
      disabled: ports.length === 0,
      items: ports.map((p: number) => p.toString()),
      selectedItems: selectedPorts,
      title: filterLabels.PORT,
    },
    {
      loading,
      onFilterFieldChange,
      fieldName: 'monitor.type',
      id: 'scheme',
      disabled: schemes.length === 0,
      items: schemes,
      selectedItems: selectedSchemes,
      title: filterLabels.SCHEME,
    },
    {
      loading,
      onFilterFieldChange,
      fieldName: 'tags',
      id: 'tags',
      disabled: tags.length === 0,
      items: tags,
      selectedItems: selectedTags,
      title: filterLabels.TAGS,
    },
  ];

  return (
    <Container>
      {filterPopoverProps.map((item) => (
        <FilterPopover key={item.id} {...item} />
      ))}
    </Container>
  );
};
