/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiTitle,
  EuiSpacer,
  EuiButtonEmpty,
  EuiAccordion,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { euiStyled } from '../../../../../../../../src/plugins/kibana_react/common';
import { useLocalUIFilters } from '../hooks/useLocalUIFilters';
import { LocalUIFilterName } from '../../../../../common/ui_filter';
import { useBreakPoints } from '../../../../hooks/use_break_points';
import { FieldValueSuggestions } from '../../../../../../observability/public';
import { URLFilter } from '../URLFilter';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';
import { SelectedFilters } from './SelectedFilters';
import { useDynamicIndexPatternFetcher } from '../../../../hooks/use_dynamic_index_pattern';
import { TRANSACTION_TYPE } from '../../../../../common/elasticsearch_fieldnames';
import { TRANSACTION_PAGE_LOAD } from '../../../../../common/transaction_types';

const ButtonWrapper = euiStyled.div`
  display: inline-block;
`;
const filterNames: LocalUIFilterName[] = [
  'location',
  'device',
  'os',
  'browser',
];

const RUM_DATA_FILTERS = [
  { term: { [TRANSACTION_TYPE]: TRANSACTION_PAGE_LOAD } },
];

function LocalUIFilters() {
  const { filters = [], setFilterValue, clearValues } = useLocalUIFilters({
    filterNames,
  });

  const { indexPattern } = useDynamicIndexPatternFetcher();

  const {
    urlParams: { start, end },
  } = useUrlParams();

  const hasValues = filters.some((filter) => filter.value?.length > 0);

  const { isSmall } = useBreakPoints();

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
    <EuiFlexGroup wrap>
      <EuiFlexItem>
        <URLFilter />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFilterGroup fullWidth={true}>
          {filters.map((filter) => (
            <FieldValueSuggestions
              key={filter.name}
              sourceField={filter.fieldName}
              indexPatternTitle={indexPattern?.title}
              label={filter.title}
              asCombobox={false}
              selectedValue={filter.value}
              asFilterButton={true}
              onChange={(values) => {
                setFilterValue(filter.name, values || []);
              }}
              filters={RUM_DATA_FILTERS}
              time={{ from: start!, to: end! }}
            />
          ))}
        </EuiFilterGroup>
        <EuiSpacer size="xs" />
        {hasValues && (
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem grow={false}>
              <SelectedFilters
                filters={filters}
                indexPatternTitle={indexPattern?.title}
                onChange={(name, values) => {
                  setFilterValue(name, values);
                }}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <ButtonWrapper>
                <EuiButtonEmpty
                  size="xs"
                  iconType="cross"
                  flush="left"
                  onClick={clearValues}
                  data-cy="clearFilters"
                >
                  {i18n.translate('xpack.apm.clearFilters', {
                    defaultMessage: 'Clear filters',
                  })}
                </EuiButtonEmpty>
              </ButtonWrapper>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
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
