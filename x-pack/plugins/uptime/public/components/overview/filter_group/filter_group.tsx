/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFilterGroup } from '@elastic/eui';
import styled from 'styled-components';
import { FilterPopoverProps, FilterPopover } from './filter_popover';
import { filterLabels } from './translations';
import { OverviewFiltersByFieldName } from '../../../../common/runtime_types/overview_filters/overview_filters';
import { FilterMap } from '../../../../common/types';

interface Props {
  loading: boolean;
  overviewFilters: OverviewFiltersByFieldName;
  selectedFilters: FilterMap;
  updateSelectedFilters: (nextMap: FilterMap) => void;
}

const Container = styled(EuiFilterGroup)`
  margin-bottom: 10px;
`;

export const FilterGroupComponent: React.FC<Props> = ({
  overviewFilters,
  selectedFilters,
  updateSelectedFilters,
  loading,
}) => {
  const {
    'observer.geo.name': locations,
    'url.port': ports,
    'monitor.type': schemes,
    tags,
  } = overviewFilters;

  const {
    'observer.geo.name': selectedLocations,
    'url.port': selectedPorts,
    'monitor.type': selectedSchemes,
    tags: selectedTags,
  } = selectedFilters;

  const onFilterFieldChange = (fieldName: string, values: string[]) => {
    updateSelectedFilters({ ...selectedFilters, [fieldName]: values });
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
