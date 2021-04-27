/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, Fragment } from 'react';
import { EuiFieldSearch, EuiSpacer, EuiButtonEmpty, EuiFilterGroup } from '@elastic/eui';
import styled from 'styled-components';
import { rgba } from 'polished';
import { i18n } from '@kbn/i18n';
import { useAppIndexPatternContext } from '../../hooks/use_app_index_pattern';
import { useUrlStorage } from '../../hooks/use_url_storage';
import { UrlFilter } from '../../types';
import { FilterValueButton } from './filter_value_btn';
import { useValuesList } from '../../../../../hooks/use_values_list';
import { euiStyled } from '../../../../../../../../../src/plugins/kibana_react/common';

interface Props {
  seriesId: string;
  label: string;
  field: string;
  isNegated?: boolean;
  goBack: () => void;
  nestedField?: string;
}

export function FilterExpanded({ seriesId, field, label, goBack, nestedField, isNegated }: Props) {
  const { indexPattern } = useAppIndexPatternContext();

  const [value, setValue] = useState('');

  const [isOpen, setIsOpen] = useState({ value: '', negate: false });

  const { series } = useUrlStorage(seriesId);

  const { values, loading } = useValuesList({
    query: value,
    indexPattern,
    sourceField: field,
    time: series.time,
    keepHistory: true,
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
