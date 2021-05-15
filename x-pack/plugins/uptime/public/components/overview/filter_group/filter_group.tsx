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
import { filterLabels } from './translations';
import { useFilterUpdate } from '../../../hooks/use_filter_update';
import { MONITOR_ROUTE } from '../../../../common/constants';
import { useSelectedFilters } from '../../../hooks/use_selected_filters';
import { FieldValueSuggestions } from '../../../../../observability/public';
import { SelectedFilters } from './selected_filters';
import { useIndexPattern } from '../../../contexts/uptime_index_pattern_context';

const Container = styled(EuiFilterGroup)`
  margin-bottom: 10px;
`;

export const FilterGroup = () => {
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

  const filterPopoverProps = [
    {
      onFilterFieldChange,
      fieldName: 'observer.geo.name',
      selectedItems: selectedLocations,
      title: filterLabels.LOCATION,
    },
    // on monitor page we only display location filter in ping list
    ...(!isMonitorPage
      ? [
          {
            onFilterFieldChange,
            fieldName: 'url.port',
            selectedItems: selectedPorts,
            title: filterLabels.PORT,
          },
          {
            onFilterFieldChange,
            fieldName: 'monitor.type',
            selectedItems: selectedSchemes,
            title: filterLabels.SCHEME,
          },
          {
            onFilterFieldChange,
            fieldName: 'tags',
            selectedItems: selectedTags,
            title: filterLabels.TAG,
          },
        ]
      : []),
  ];

  const indexPattern = useIndexPattern();

  const [isOpen, setIsOpen] = useState('');

  return (
    <>
      <Container>
        {indexPattern &&
          filterPopoverProps.map(({ fieldName, title, selectedItems }) => (
            <FieldValueSuggestions
              key={fieldName}
              compressed={false}
              indexPattern={indexPattern}
              sourceField={fieldName}
              label={title}
              selectedValue={selectedItems}
              onChange={(values) => {
                setUpdatedFieldValues({ fieldName, values });
                setIsOpen('');
              }}
              asCombobox={false}
              asFilterButton={true}
              forceOpen={isOpen === fieldName}
              setForceOpen={() => {
                setIsOpen('');
              }}
              filters={[]}
            />
          ))}
      </Container>
      <SelectedFilters onChange={onFilterFieldChange} />
    </>
  );
};
