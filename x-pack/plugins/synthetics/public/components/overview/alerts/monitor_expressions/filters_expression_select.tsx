/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButtonIcon, EuiExpression, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { FieldValueSuggestions } from '@kbn/observability-plugin/public';
import { filterLabels } from '../../filter_group/translations';
import { alertFilterLabels, filterAriaLabels } from './translations';
import { useIndexPattern } from '../../../../contexts/uptime_index_pattern_context';
import { FILTER_FIELDS } from '../../../../../common/constants';
import { useGetUrlParams } from '../../../../hooks';

export interface FilterExpressionsSelectProps {
  ruleParams: { [key: string]: any };
  newFilters: string[];
  onRemoveFilter: (val: string) => void;
  setRuleParams: (key: string, value: any) => void;
  shouldUpdateUrl: boolean;
}

const { TYPE, TAGS, LOCATION, PORT } = FILTER_FIELDS;

export const FiltersExpressionsSelect: React.FC<FilterExpressionsSelectProps> = ({
  ruleParams,
  newFilters,
  onRemoveFilter,
  setRuleParams,
}) => {
  const alertFilters = ruleParams?.filters;

  const selectedPorts = alertFilters?.[PORT] ?? [];
  const selectedLocations = alertFilters?.[LOCATION] ?? [];
  const selectedSchemes = alertFilters?.[TYPE] ?? [];
  const selectedTags = alertFilters?.[TAGS] ?? [];

  const { dateRangeStart: from, dateRangeEnd: to } = useGetUrlParams();
  const onFilterFieldChange = (fieldName: string, values?: string[]) => {
    // the `filters` field is no longer a string
    if (ruleParams.filters && typeof ruleParams.filters !== 'string') {
      setRuleParams('filters', { ...ruleParams.filters, [fieldName]: values });
    } else {
      setRuleParams(
        'filters',
        Object.assign(
          {},
          {
            [TAGS]: [],
            [PORT]: [],
            [LOCATION]: [],
            [TYPE]: [],
          },
          { [fieldName]: values ?? [] }
        )
      );
    }
  };

  const monitorFilters = [
    {
      ariaLabel: filterAriaLabels.PORT,
      onFilterFieldChange,
      loading: false,
      fieldName: 'url.port',
      id: 'filter_port',
      selectedItems: selectedPorts,
      title: filterLabels.PORT,
      description:
        selectedPorts.length === 0 ? alertFilterLabels.USING : alertFilterLabels.USING_PORT,
      value: selectedPorts.length === 0 ? alertFilterLabels.ANY_PORT : selectedPorts?.join(','),
    },
    {
      ariaLabel: filterAriaLabels.TAG,
      onFilterFieldChange,
      loading: false,
      fieldName: 'tags',
      id: 'filter_tags',
      selectedItems: selectedTags,
      title: filterLabels.TAG,
      description: selectedTags.length === 0 ? alertFilterLabels.WITH : alertFilterLabels.WITH_TAG,
      value: selectedTags.length === 0 ? alertFilterLabels.ANY_TAG : selectedTags?.join(','),
    },
    {
      ariaLabel: filterAriaLabels.SCHEME,
      onFilterFieldChange,
      loading: false,
      fieldName: 'monitor.type',
      id: 'filter_scheme',
      selectedItems: selectedSchemes,
      title: filterLabels.SCHEME,
      description: selectedSchemes.length === 0 ? alertFilterLabels.OF : alertFilterLabels.OF_TYPE,
      value: selectedSchemes.length === 0 ? alertFilterLabels.ANY_TYPE : selectedSchemes?.join(','),
    },
    {
      ariaLabel: filterAriaLabels.LOCATION,
      onFilterFieldChange,
      loading: false,
      fieldName: 'observer.geo.name',
      id: 'filter_location',
      selectedItems: selectedLocations,
      title: filterLabels.LOCATION,
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

  const indexPattern = useIndexPattern();

  return (
    <>
      {filtersToDisplay.map(
        ({ description, id, title, value, fieldName, ariaLabel, selectedItems }) => (
          <EuiFlexGroup key={id}>
            <EuiFlexItem>
              {indexPattern && (
                <FieldValueSuggestions
                  filters={[]}
                  key={fieldName}
                  dataViewTitle={indexPattern.title}
                  sourceField={fieldName}
                  label={title}
                  onChange={(vals) => {
                    onFilterFieldChange(fieldName, vals);
                  }}
                  selectedValue={selectedItems}
                  button={
                    <EuiExpression
                      aria-label={ariaLabel}
                      color={'success'}
                      data-test-subj={'uptimeCreateStatusAlert.' + id}
                      description={description}
                      value={value}
                      onClick={() => setIsOpen({ ...isOpen, [id]: !isOpen[id] })}
                    />
                  }
                  forceOpen={isOpen[id]}
                  setForceOpen={() => {
                    setIsOpen({ ...isOpen, [id]: !isOpen[id] });
                  }}
                  asCombobox={false}
                  cardinalityField="monitor.id"
                  time={{ from, to }}
                  allowExclusions={false}
                />
              )}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                aria-label={alertFilterLabels.REMOVE_FILTER_LABEL(title)}
                iconType="trash"
                color="danger"
                onClick={() => {
                  onRemoveFilter(fieldName);
                  onFilterFieldChange(fieldName, []);
                }}
              />
            </EuiFlexItem>
            <EuiSpacer size="xs" />
          </EuiFlexGroup>
        )
      )}
    </>
  );
};
