/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, Fragment } from 'react';
import { EuiFieldSearch, EuiSpacer, EuiButtonEmpty, EuiFilterGroup, EuiText } from '@elastic/eui';
import styled from 'styled-components';
import { rgba } from 'polished';
import { i18n } from '@kbn/i18n';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/api/types';
import { useAppIndexPatternContext } from '../../hooks/use_app_index_pattern';
import { useSeriesStorage } from '../../hooks/use_series_storage';
import { DataSeries, UrlFilter } from '../../types';
import { FilterValueButton } from './filter_value_btn';
import { useValuesList } from '../../../../../hooks/use_values_list';
import { euiStyled } from '../../../../../../../../../src/plugins/kibana_react/common';
import { ESFilter } from '../../../../../../../../../typings/elasticsearch';
import { PersistableFilter } from '../../../../../../../lens/common';
import { ExistsFilter } from '../../../../../../../../../src/plugins/data/common/es_query/filters';

interface Props {
  seriesId: string;
  label: string;
  field: string;
  isNegated?: boolean;
  goBack: () => void;
  nestedField?: string;
  filters: DataSeries['filters'];
}

export function FilterExpanded({
  seriesId,
  field,
  label,
  goBack,
  nestedField,
  isNegated,
  filters: defaultFilters,
}: Props) {
  const { indexPattern } = useAppIndexPatternContext();

  const [value, setValue] = useState('');

  const [isOpen, setIsOpen] = useState({ value: '', negate: false });

  const { getSeries } = useSeriesStorage();

  const series = getSeries(seriesId);

  const queryFilters: ESFilter[] = [];

  defaultFilters?.forEach((qFilter: PersistableFilter | ExistsFilter) => {
    if (qFilter.query) {
      queryFilters.push(qFilter.query);
    }
    const asExistFilter = qFilter as ExistsFilter;
    if (asExistFilter?.exists) {
      queryFilters.push(asExistFilter.exists as QueryDslQueryContainer);
    }
  });

  const { values, loading } = useValuesList({
    query: value,
    indexPattern,
    sourceField: field,
    time: series.time,
    keepHistory: true,
    filters: queryFilters,
  });

  const filters = series?.filters ?? [];

  const currFilter: UrlFilter | undefined = filters.find(({ field: fd }) => field === fd);

  const displayValues = values.filter((opt) => opt.toLowerCase().includes(value.toLowerCase()));

  return (
    <Wrapper>
      <EuiButtonEmpty iconType="arrowLeft" color="text" onClick={() => goBack()}>
        {label}
      </EuiButtonEmpty>
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
                  isNestedOpen={isOpen}
                  setIsNestedOpen={setIsOpen}
                />
              )}
              <FilterValueButton
                field={field}
                value={opt}
                allSelectedValues={currFilter?.values}
                nestedField={nestedField}
                seriesId={seriesId}
                negate={false}
                isNestedOpen={isOpen}
                setIsNestedOpen={setIsOpen}
              />
            </EuiFilterGroup>
            <EuiSpacer size="s" />
          </Fragment>
        ))}
      </ListWrapper>
    </Wrapper>
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
