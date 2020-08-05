/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiButtonIcon, EuiExpression, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { FilterPopover } from '../../filter_group/filter_popover';
import { filterLabels } from '../../filter_group/translations';
import { alertFilterLabels } from './translations';
import { FilterExpressionsSelectProps } from './filters_expression_select_container';
import { OverviewFiltersState } from '../../../../state/reducers/overview_filters';

type FilterFieldUpdate = (updateTarget: { fieldName: string; values: string[] }) => void;

interface OwnProps {
  setUpdatedFieldValues: FilterFieldUpdate;
}

type Props = FilterExpressionsSelectProps & Pick<OverviewFiltersState, 'filters'> & OwnProps;

export const FiltersExpressionsSelect: React.FC<Props> = ({
  alertParams,
  filters: overviewFilters,
  newFilters,
  onRemoveFilter,
  setAlertParams,
  setUpdatedFieldValues,
}) => {
  const { tags, ports, schemes, locations } = overviewFilters;
  const selectedPorts = alertParams?.filters?.['url.port'] ?? [];
  const selectedLocations = alertParams?.filters?.['observer.geo.name'] ?? [];
  const selectedSchemes = alertParams?.filters?.['monitor.type'] ?? [];
  const selectedTags = alertParams?.filters?.tags ?? [];

  const onFilterFieldChange = (fieldName: string, values: string[]) => {
    // the `filters` field is no longer a string
    if (alertParams.filters && typeof alertParams.filters !== 'string') {
      setAlertParams('filters', { ...alertParams.filters, [fieldName]: values });
    } else {
      setAlertParams(
        'filters',
        Object.assign(
          {},
          {
            tags: [],
            'url.port': [],
            'observer.geo.name': [],
            'monitor.type': [],
          },
          { [fieldName]: values }
        )
      );
    }
    setUpdatedFieldValues({ fieldName, values });
  };

  const monitorFilters = [
    {
      onFilterFieldChange,
      loading: false,
      fieldName: 'url.port',
      id: 'filter_port',
      disabled: ports?.length === 0,
      items: ports?.map((p: number) => p.toString()) ?? [],
      selectedItems: selectedPorts,
      title: filterLabels.PORT,
      description:
        selectedPorts.length === 0 ? alertFilterLabels.USING : alertFilterLabels.USING_PORT,
      value: selectedPorts.length === 0 ? alertFilterLabels.ANY_PORT : selectedPorts?.join(','),
    },
    {
      onFilterFieldChange,
      loading: false,
      fieldName: 'tags',
      id: 'filter_tags',
      disabled: tags?.length === 0,
      items: tags ?? [],
      selectedItems: selectedTags,
      title: filterLabels.TAGS,
      description: selectedTags.length === 0 ? alertFilterLabels.WITH : alertFilterLabels.WITH_TAG,
      value: selectedTags.length === 0 ? alertFilterLabels.ANY_TAG : selectedTags?.join(','),
    },
    {
      onFilterFieldChange,
      loading: false,
      fieldName: 'monitor.type',
      id: 'filter_scheme',
      disabled: schemes?.length === 0,
      items: schemes ?? [],
      selectedItems: selectedSchemes,
      title: filterLabels.SCHEME,
      description: selectedSchemes.length === 0 ? alertFilterLabels.OF : alertFilterLabels.OF_TYPE,
      value: selectedSchemes.length === 0 ? alertFilterLabels.ANY_TYPE : selectedSchemes?.join(','),
    },
    {
      onFilterFieldChange,
      loading: false,
      fieldName: 'observer.geo.name',
      id: 'filter_location',
      disabled: locations?.length === 0,
      items: locations ?? [],
      selectedItems: selectedLocations,
      title: filterLabels.SCHEME,
      description:
        selectedLocations.length === 0 ? alertFilterLabels.FROM : alertFilterLabels.FROM_LOCATION,
      value:
        selectedLocations.length === 0
          ? alertFilterLabels.ANY_LOCATION
          : selectedLocations?.join(','),
    },
  ];

  const [isOpen, setIsOpen] = useState<any>({
    filter_port: false,
    filter_tags: false,
    filter_scheme: false,
    filter_location: false,
  });

  const filtersToDisplay = monitorFilters.filter(
    (curr) => curr.selectedItems.length > 0 || newFilters?.includes(curr.fieldName)
  );

  return (
    <>
      {filtersToDisplay.map(({ description, value, ...item }) => (
        <EuiFlexGroup key={item.id}>
          <EuiFlexItem>
            <FilterPopover
              {...item}
              btnContent={
                <EuiExpression
                  aria-label={'ariaLabel'}
                  color={'secondary'}
                  data-test-subj={'uptimeCreateStatusAlert.' + item.id}
                  description={description}
                  value={value}
                  onClick={() => setIsOpen({ ...isOpen, [item.id]: !isOpen[item.id] })}
                />
              }
              forceOpen={isOpen[item.id]}
              setForceOpen={() => {
                setIsOpen({ ...isOpen, [item.id]: !isOpen[item.id] });
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              aria-label="Remove filter"
              iconType="trash"
              color="danger"
              onClick={() => {
                onRemoveFilter(item.fieldName);
                onFilterFieldChange(item.fieldName, []);
              }}
            />
          </EuiFlexItem>

          <EuiSpacer size="xs" />
        </EuiFlexGroup>
      ))}

      <EuiSpacer size="xs" />
    </>
  );
};
