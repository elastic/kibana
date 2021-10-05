/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, Fragment } from 'react';
import {
  EuiFieldSearch,
  EuiSpacer,
  EuiFilterGroup,
  EuiText,
  EuiPopover,
  EuiFilterButton,
} from '@elastic/eui';
import styled from 'styled-components';
import { rgba } from 'polished';
import { i18n } from '@kbn/i18n';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/api/types';
import { map } from 'lodash';
import { ExistsFilter, isExistsFilter } from '@kbn/es-query';
import { useAppIndexPatternContext } from '../../hooks/use_app_index_pattern';
import { SeriesConfig, SeriesUrl, UrlFilter } from '../../types';
import { FilterValueButton } from './filter_value_btn';
import { useValuesList } from '../../../../../hooks/use_values_list';
import { euiStyled } from '../../../../../../../../../src/plugins/kibana_react/common';
import { ESFilter } from '../../../../../../../../../src/core/types/elasticsearch';
import { PersistableFilter } from '../../../../../../../lens/common';

interface Props {
  seriesId: number;
  series: SeriesUrl;
  label: string;
  field: string;
  isNegated?: boolean;
  nestedField?: string;
  filters: SeriesConfig['baseFilters'];
}

export interface NestedFilterOpen {
  value: string;
  negate: boolean;
}

export function FilterExpanded({
  seriesId,
  series,
  field,
  label,
  nestedField,
  isNegated,
  filters: defaultFilters,
}: Props) {
  const [value, setValue] = useState('');

  const [isOpen, setIsOpen] = useState(false);
  const [isNestedOpen, setIsNestedOpen] = useState<NestedFilterOpen>({ value: '', negate: false });

  const queryFilters: ESFilter[] = [];

  const { indexPatterns } = useAppIndexPatternContext(series.dataType);

  defaultFilters?.forEach((qFilter: PersistableFilter | ExistsFilter) => {
    if (qFilter.query) {
      queryFilters.push(qFilter.query);
    }
    if (isExistsFilter(qFilter)) {
      queryFilters.push({ exists: qFilter.exists } as QueryDslQueryContainer);
    }
  });

  const { values, loading } = useValuesList({
    query: value,
    sourceField: field,
    time: series.time,
    keepHistory: true,
    filters: queryFilters,
    indexPatternTitle: indexPatterns[series.dataType]?.title,
  });

  const filters = series?.filters ?? [];

  const currFilter: UrlFilter | undefined = filters.find(({ field: fd }) => field === fd);

  const displayValues = map(values, 'label').filter((opt) =>
    opt.toLowerCase().includes(value.toLowerCase())
  );

  return (
    <EuiPopover
      button={
        <EuiFilterButton onClick={() => setIsOpen((prevState) => !prevState)} iconType="arrowDown">
          {label}
        </EuiFilterButton>
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
    >
      <Wrapper>
        <EuiFieldSearch
          fullWidth
          isLoading={loading}
          value={value}
          onChange={(evt) => {
            setValue(evt.target.value);
          }}
          placeholder={i18n.translate('xpack.observability.filters.expanded.search', {
            defaultMessage: 'Search for {label}',
            values: { label },
          })}
        />
        <EuiSpacer size="s" />
        <ListWrapper>
          {displayValues.length === 0 && !loading && (
            <EuiText>
              {i18n.translate('xpack.observability.filters.expanded.noFilter', {
                defaultMessage: 'No filters found.',
              })}
            </EuiText>
          )}
          {displayValues.map((opt) => (
            <Fragment key={opt}>
              <EuiFilterGroup fullWidth={true} color="primary">
                {isNegated !== false && (
                  <FilterValueButton
                    field={field}
                    value={opt}
                    allSelectedValues={currFilter?.notValues}
                    negate={true}
                    nestedField={nestedField}
                    seriesId={seriesId}
                    series={series}
                    isNestedOpen={isNestedOpen}
                    setIsNestedOpen={setIsNestedOpen}
                  />
                )}
                <FilterValueButton
                  field={field}
                  value={opt}
                  allSelectedValues={currFilter?.values}
                  nestedField={nestedField}
                  seriesId={seriesId}
                  series={series}
                  negate={false}
                  isNestedOpen={isNestedOpen}
                  setIsNestedOpen={setIsNestedOpen}
                />
              </EuiFilterGroup>
              <EuiSpacer size="s" />
            </Fragment>
          ))}
        </ListWrapper>
      </Wrapper>
    </EuiPopover>
  );
}

const ListWrapper = euiStyled.div`
  height: 400px;
  overflow-y: auto;
  &::-webkit-scrollbar {
    height: ${({ theme }) => theme.eui.euiScrollBar};
    width: ${({ theme }) => theme.eui.euiScrollBar};
  }
  &::-webkit-scrollbar-thumb {
    background-clip: content-box;
    background-color: ${({ theme }) => rgba(theme.eui.euiColorDarkShade, 0.5)};
    border: ${({ theme }) => theme.eui.euiScrollBarCorner} solid transparent;
  }
  &::-webkit-scrollbar-corner,
  &::-webkit-scrollbar-track {
    background-color: transparent;
  }
`;

const Wrapper = styled.div`
  width: 400px;
`;
