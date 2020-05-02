/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { EuiButtonIcon, EuiExpression, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { FilterPopover } from '../../filter_group/filter_popover';
import { overviewFiltersSelector } from '../../../../state/selectors';
import { useFilterUpdate } from '../../../../hooks/use_filter_update';
import { filterLabels } from '../../filter_group/translations';
import { alertFilterLabels } from './translations';

interface Props {
  newFilters: string[];
  onRemoveFilter: (val: string) => void;
  setAlertParams: (key: string, value: any) => void;
}

export const FiltersExpressionsSelect: React.FC<Props> = ({
  setAlertParams,
  newFilters,
  onRemoveFilter,
}) => {
  const { tags, ports, schemes, locations } = useSelector(overviewFiltersSelector);

  const [updatedFieldValues, setUpdatedFieldValues] = useState<{
    fieldName: string;
    values: string[];
  }>({ fieldName: '', values: [] });

  const currentFilters = useFilterUpdate(updatedFieldValues.fieldName, updatedFieldValues.values);

  useEffect(() => {
    if (updatedFieldValues.fieldName === 'observer.geo.name') {
      setAlertParams('locations', updatedFieldValues.values);
    }
  }, [setAlertParams, updatedFieldValues]);

  useEffect(() => {
    setAlertParams('locations', []);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedTags = currentFilters.get('tags');
  const selectedPorts = currentFilters.get('url.port');
  const selectedScheme = currentFilters.get('monitor.type');
  const selectedLocation = currentFilters.get('observer.geo.name');

  const getSelectedItems = (fieldName: string) => currentFilters.get(fieldName) || [];

  const onFilterFieldChange = (fieldName: string, values: string[]) => {
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
      selectedItems: getSelectedItems('url.port'),
      title: filterLabels.PORT,
      description: selectedPorts ? alertFilterLabels.USING_PORT : alertFilterLabels.USING,
      value: selectedPorts?.join(',') ?? alertFilterLabels.ANY_PORT,
    },
    {
      onFilterFieldChange,
      loading: false,
      fieldName: 'tags',
      id: 'filter_tags',
      disabled: tags?.length === 0,
      items: tags ?? [],
      selectedItems: getSelectedItems('tags'),
      title: filterLabels.TAGS,
      description: selectedTags ? alertFilterLabels.WITH_TAG : alertFilterLabels.WITH,
      value: selectedTags?.join(',') ?? alertFilterLabels.ANY_TAG,
    },
    {
      onFilterFieldChange,
      loading: false,
      fieldName: 'monitor.type',
      id: 'filter_scheme',
      disabled: schemes?.length === 0,
      items: schemes ?? [],
      selectedItems: getSelectedItems('monitor.type'),
      title: filterLabels.SCHEME,
      description: selectedScheme ? alertFilterLabels.OF_TYPE : alertFilterLabels.OF,
      value: selectedScheme?.join(',') ?? alertFilterLabels.ANY_TYPE,
    },
    {
      onFilterFieldChange,
      loading: false,
      fieldName: 'observer.geo.name',
      id: 'filter_location',
      disabled: locations?.length === 0,
      items: locations ?? [],
      selectedItems: getSelectedItems('observer.geo.name'),
      title: filterLabels.SCHEME,
      description: selectedLocation ? alertFilterLabels.FROM_LOCATION : alertFilterLabels.FROM,
      value: selectedLocation?.join(',') ?? alertFilterLabels.ANY_LOCATION,
    },
  ];

  const [isOpen, setIsOpen] = useState<any>({
    filter_port: false,
    filter_tags: false,
    filter_scheme: false,
    filter_location: false,
  });

  const filtersToDisplay = monitorFilters.filter(
    curr => curr.selectedItems.length > 0 || newFilters?.includes(curr.fieldName)
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
