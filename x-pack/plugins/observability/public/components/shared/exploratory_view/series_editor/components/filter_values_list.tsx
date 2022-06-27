/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFieldSearch, EuiFilterGroup, EuiProgress, EuiSpacer, EuiText } from '@elastic/eui';
import React, { Fragment, useState } from 'react';
import { rgba } from 'polished';
import styled from 'styled-components';
import { map } from 'lodash';
import { i18n } from '@kbn/i18n';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { FilterValueButton } from '../columns/filter_value_btn';
import { FilterProps, NestedFilterOpen } from '../columns/filter_expanded';
import { UrlFilter } from '../../types';
import { ListItem } from '../../../../../hooks/use_values_list';

interface Props extends FilterProps {
  values: ListItem[];
  field: string;
  query: string;
  loading?: boolean;
  setQuery: (q: string) => void;
}

export function FilterValuesList({
  field,
  values,
  query,
  setQuery,
  label,
  loading,
  isNegated,
  nestedField,
  series,
  seriesId,
}: Props) {
  const [isNestedOpen, setIsNestedOpen] = useState<NestedFilterOpen>({ value: '', negate: false });

  const displayValues = map(values, 'label').filter((opt) =>
    opt.toLowerCase().includes(query.toLowerCase())
  );

  const filters = series?.filters ?? [];

  const currFilter: UrlFilter | undefined = filters.find(({ field: fd }) => field === fd);

  const btnProps = {
    field,
    nestedField,
    seriesId,
    series,
    isNestedOpen,
    setIsNestedOpen,
  };

  return (
    <Wrapper>
      <EuiFieldSearch
        fullWidth
        isLoading={loading}
        value={query}
        onChange={(evt) => {
          setQuery(evt.target.value);
        }}
        placeholder={getSearchLabel(label)}
      />
      <EuiSpacer size="s" />
      <ListWrapper>
        {loading && (
          <div className="eui-textCenter">
            <EuiProgress
              size="xs"
              color="primary"
              position="absolute"
              style={{
                top: 'initial',
              }}
            />
          </div>
        )}
        {displayValues.length === 0 && !loading && (
          <EuiText className="eui-textCenter">{NO_RESULT_FOUND}</EuiText>
        )}
        {displayValues.map((opt) => (
          <Fragment key={opt}>
            <EuiFilterGroup fullWidth={true} color="primary">
              {isNegated !== false && (
                <FilterValueButton
                  {...btnProps}
                  value={opt}
                  negate={true}
                  allSelectedValues={currFilter?.notValues}
                />
              )}
              <FilterValueButton
                {...btnProps}
                value={opt}
                negate={false}
                allSelectedValues={currFilter?.values}
              />
            </EuiFilterGroup>
            <EuiSpacer size="s" />
          </Fragment>
        ))}
      </ListWrapper>
    </Wrapper>
  );
}

const NO_RESULT_FOUND = i18n.translate('xpack.observability.filters.expanded.noFilter', {
  defaultMessage: 'No filters found.',
});

const getSearchLabel = (label: string) =>
  i18n.translate('xpack.observability.filters.expanded.search', {
    defaultMessage: 'Search for {label}',
    values: { label },
  });

const ListWrapper = euiStyled.div`
  height: 370px;
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
