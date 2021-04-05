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
  EuiButtonEmpty,
  EuiLoadingSpinner,
  EuiFilterGroup,
} from '@elastic/eui';
import { useIndexPatternContext } from '../../hooks/use_default_index_pattern';
import { useUrlStorage } from '../../hooks/use_url_strorage';
import { UrlFilter } from '../../types';
import { FilterValueButton } from './filter_value_btn';
import { useValuesList } from '../../../../../hooks/use_values_list';

interface Props {
  seriesId: string;
  label: string;
  field: string;
  goBack: () => void;
  nestedField?: string;
}

export function FilterExpanded({ seriesId, field, label, goBack, nestedField }: Props) {
  const { indexPattern } = useIndexPatternContext();

  const [value, setValue] = useState('');

  const [isOpen, setIsOpen] = useState({ value: '', negate: false });

  const { series } = useUrlStorage(seriesId);

  const { values, loading } = useValuesList({
    sourceField: field,
    time: series.time,
    indexPattern,
  });

  const filters = series?.filters ?? [];

  const currFilter: UrlFilter | undefined = filters.find(({ field: fd }) => field === fd);

  const displayValues = (values || []).filter((opt) =>
    opt.toLowerCase().includes(value.toLowerCase())
  );

  return (
    <>
      <EuiButtonEmpty iconType="arrowLeft" color="text" onClick={() => goBack()}>
        {label}
      </EuiButtonEmpty>
      <EuiFieldSearch
        fullWidth
        value={value}
        onChange={(evt) => {
          setValue(evt.target.value);
        }}
      />
      <EuiSpacer size="s" />
      {loading && (
        <div style={{ textAlign: 'center' }}>
          <EuiLoadingSpinner />
        </div>
      )}
      {displayValues.map((opt) => (
        <Fragment key={opt}>
          <EuiFilterGroup fullWidth={true} color="primary">
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
    </>
  );
}
