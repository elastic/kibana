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
import { ESFilter } from '@kbn/core/types/elasticsearch';
import { FieldValueSuggestions } from '@kbn/observability-plugin/public';
import { useLocalUIFilters } from '../hooks/use_local_uifilters';

import { useBreakpoints } from '../../../../hooks/use_breakpoints';
import { URLFilter } from '../url_filter';
import { SelectedFilters } from './selected_filters';
import { useDataView } from './use_data_view';
import { environmentQuery } from './queries';
import { useUxUrlParams } from '../../../../context/url_params_context/use_ux_url_params';

import {
  uxFiltersByName,
  UxLocalUIFilterName,
  uxLocalUIFilterNames,
} from '../../../../../common/ux_ui_filter';
import { ENVIRONMENT_ALL } from '../../../../../common/environment_filter_values';
import { TRANSACTION_PAGE_LOAD } from '../../../../../common/transaction_types';
import {
  SERVICE_NAME,
  TRANSACTION_TYPE,
} from '../../../../../common/elasticsearch_fieldnames';

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
  const { dataViewTitle, dataView } = useDataView();

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
        {i18n.translate('xpack.ux.localFiltersTitle', {
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
                dataViewTitle={dataViewTitle}
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
        indexPattern={dataView}
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
