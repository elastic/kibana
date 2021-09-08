/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiTitle,
  EuiSpacer,
  EuiAccordion,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ESFilter } from 'src/core/types/elasticsearch';
import { useLocalUIFilters } from '../hooks/useLocalUIFilters';
import {
  uxFiltersByName,
  UxLocalUIFilterName,
  uxLocalUIFilterNames,
} from '../../../../../common/ux_ui_filter';
import { useBreakpoints } from '../../../../hooks/use_breakpoints';
import { FieldValueSuggestions } from '../../../../../../observability/public';
import { URLFilter } from '../URLFilter';
import { SelectedFilters } from './SelectedFilters';
import {
  SERVICE_NAME,
  TRANSACTION_TYPE,
} from '../../../../../common/elasticsearch_fieldnames';
import { TRANSACTION_PAGE_LOAD } from '../../../../../common/transaction_types';
import { useIndexPattern } from './use_index_pattern';
import { environmentQuery } from './queries';
import { ENVIRONMENT_ALL } from '../../../../../common/environment_filter_values';
import { useUxUrlParams } from '../../../../context/url_params_context/use_ux_url_params';

const filterNames: UxLocalUIFilterName[] = [
  'location',
  'device',
  'os',
  'browser',
];

export const getExcludedName = (filterName: string) => {
  return `${filterName}Excluded` as UxLocalUIFilterName;
};

const RUM_DATA_FILTERS = [
  { term: { [TRANSACTION_TYPE]: TRANSACTION_PAGE_LOAD } },
];

function LocalUIFilters() {
  const { indexPatternTitle, indexPattern } = useIndexPattern();

  const {
    filters = [],
    setFilterValue,
    invertFilter,
    clearValues,
  } = useLocalUIFilters({
    filterNames: uxLocalUIFilterNames.filter(
      (name) => !['serviceName'].includes(name)
    ),
  });

  const {
    urlParams: { start, end, serviceName, environment },
  } = useUxUrlParams();

  const getFilters = useMemo(() => {
    const dataFilters: ESFilter[] = [
      ...RUM_DATA_FILTERS,
      ...environmentQuery(environment || ENVIRONMENT_ALL.value),
    ];
    if (serviceName) {
      dataFilters.push({
        term: {
          [SERVICE_NAME]: serviceName,
        },
      });
    }
    return dataFilters;
  }, [environment, serviceName]);

  const { isSmall } = useBreakpoints();

  const title = (
    <EuiTitle size="s">
      <h3>
        {i18n.translate('xpack.apm.localFiltersTitle', {
          defaultMessage: 'Filters',
        })}
      </h3>
    </EuiTitle>
  );

  const content = (
    <>
      <EuiFlexGroup wrap>
        <EuiFlexItem>
          <URLFilter />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFilterGroup fullWidth={true}>
            {filterNames.map((filterName) => (
              <FieldValueSuggestions
                key={filterName}
                sourceField={uxFiltersByName[filterName].fieldName}
                indexPatternTitle={indexPatternTitle}
                label={uxFiltersByName[filterName].title}
                asCombobox={false}
                selectedValue={
                  filters.find((ft) => ft.name === filterName && !ft.excluded)
                    ?.value
                }
                excludedValue={
                  filters.find(
                    (ft) =>
                      ft.name === getExcludedName(filterName) && ft.excluded
                  )?.value
                }
                asFilterButton={true}
                onChange={(values, excludedValues) => {
                  setFilterValue(filterName, values || []);
                  setFilterValue(
                    getExcludedName(filterName),
                    excludedValues || []
                  );
                }}
                filters={getFilters}
                time={{ from: start!, to: end! }}
              />
            ))}
          </EuiFilterGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <SelectedFilters
        filters={filters}
        onChange={(name, values) => {
          setFilterValue(name, values);
        }}
        clearValues={clearValues}
        invertFilter={invertFilter}
        indexPattern={indexPattern}
      />
    </>
  );

  return isSmall ? (
    <EuiAccordion id={'uxFilterAccordion'} buttonContent={title}>
      {content}
    </EuiAccordion>
  ) : (
    <>{content}</>
  );
}

export { LocalUIFilters };
