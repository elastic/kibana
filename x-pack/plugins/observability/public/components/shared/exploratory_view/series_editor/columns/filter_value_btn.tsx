/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFilterButton, hexToRgb } from '@elastic/eui';
import { useIndexPatternContext } from '../../../../../hooks/use_default_index_pattern';
import { useUrlStorage } from '../../hooks/use_url_strorage';
import { FieldValueSelection } from '../../../field_value_selection';
import { useSeriesFilters } from '../../hooks/use_series_filters';
import { euiStyled } from '../../../../../../../../../src/plugins/kibana_react/common';

interface Props {
  value: string;
  field: string;
  allValues?: string[];
  negate: boolean;
  nestedField?: string;
  seriesId: string;
  isOpen: {
    value: string;
    negate: boolean;
  };
  setIsOpen: (val: { value: string; negate: boolean }) => void;
}

export function FilterValueButton({
  isOpen,
  setIsOpen,
  value,
  field,
  allValues,
  negate,
  seriesId,
  nestedField,
}: Props) {
  const { series } = useUrlStorage(seriesId);

  const { indexPattern } = useIndexPatternContext();

  const { setFilter, removeFilter } = useSeriesFilters({ seriesId });

  const hasActiveFilters = (allValues ?? []).includes(value);

  const button = (
    <FilterButton
      hasActiveFilters={hasActiveFilters}
      color={negate ? 'danger' : 'primary'}
      onClick={() => {
        if (hasActiveFilters) {
          removeFilter({ field, value, negate });
        } else {
          setFilter({ field, value, negate });
        }
        if (!hasActiveFilters) {
          setIsOpen({ value, negate });
        } else {
          setIsOpen({ value: '', negate });
        }
      }}
      className=""
    >
      {negate ? `Not ${value}` : value}
    </FilterButton>
  );

  const onNestedChange = (val?: string) => {
    setFilter({ field: nestedField!, value: val });
    setIsOpen({ value: '', negate });
  };

  return nestedField ? (
    <FieldValueSelection
      button={button}
      label={'Version'}
      indexPattern={indexPattern}
      sourceField={nestedField}
      onChange={onNestedChange}
      filters={[
        {
          term: {
            [field]: value,
          },
        },
      ]}
      forceOpen={isOpen?.value === value && isOpen.negate === negate}
      anchorPosition="rightCenter"
      time={series.time}
    />
  ) : (
    button
  );
}

const FilterButton = euiStyled(EuiFilterButton)`
  background-color: rgba(${(props) => {
    const color = props.hasActiveFilters
      ? props.color === 'danger'
        ? hexToRgb(props.theme.eui.euiColorDanger)
        : hexToRgb(props.theme.eui.euiColorPrimary)
      : 'initial';
    return `${color[0]}, ${color[1]}, ${color[2]}, 0.1`;
  }});
`;
