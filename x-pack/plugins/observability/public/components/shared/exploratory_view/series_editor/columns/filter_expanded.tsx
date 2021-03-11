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
  EuiFilterButton,
  EuiFilterGroup,
} from '@elastic/eui';
import { ObservabilityClientPluginsStart } from '../../../../../plugin';
import { useFetcher } from '../../../../..';
import { useKibana } from '../../../../../../../../../src/plugins/kibana_react/public';
import { useIndexPatternContext } from '../../../../../hooks/use_default_index_pattern';
import { useUrlStorage } from '../../hooks/use_url_strorage';
import { UrlFilter } from '../../types';

interface Props {
  seriesId: string;
  label: string;
  field: string;
  goBack: () => void;
}

export const FilterExpanded = ({ seriesId, field, label, goBack }: Props) => {
  const { indexPattern } = useIndexPatternContext();

  const [value, setValue] = useState('');

  const {
    services: { data },
  } = useKibana<ObservabilityClientPluginsStart>();

  const { series, setSeries } = useUrlStorage(seriesId);

  const { data: values, status } = useFetcher(() => {
    return data.autocomplete.getValueSuggestions({
      indexPattern,
      query: '',
      useTimeRange: false,
      field: { name: field, type: 'string', aggregatable: true },
    });
  }, [field]);

  const filters = series?.filters ?? [];

  let currFilter: UrlFilter | undefined = filters.find(({ field: fd }) => field === fd);

  const onChange = (id: string, not?: boolean) => {
    if (!currFilter && filters.length === 0) {
      currFilter = { field };
      if (not) {
        currFilter.notValues = [id];
      } else {
        currFilter.values = [id];
      }
      setSeries(seriesId, { ...series, filters: [currFilter] });
      return;
    }

    if (currFilter) {
      const currNotValues = currFilter.notValues ?? [];
      const currValues = currFilter.values ?? [];

      const notValues = currNotValues.filter((val) => val !== id);
      const values = currValues.filter((val) => val !== id);

      if (not && !currNotValues.includes(id)) {
        notValues.push(id);
      } else if (!currValues.includes(id)) {
        values.push(id);
      }

      currFilter.notValues = notValues.length > 0 ? notValues : undefined;
      currFilter.values = values.length > 0 ? values : undefined;

      if (notValues.length > 0 || values.length > 0) {
        setSeries(seriesId, { ...series, filters: [currFilter] });
      } else {
        setSeries(seriesId, { ...series, filters: undefined });
      }
    }
  };

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
      {status === 'loading' && <EuiLoadingSpinner />}
      {(values || [])
        .filter((opt) => opt.toLowerCase().includes(value.toLowerCase()))
        .map((opt) => (
          <Fragment key={opt}>
            <EuiFilterGroup fullWidth={true} color="primary">
              <EuiFilterButton
                hasActiveFilters={(currFilter?.notValues ?? []).includes(opt)}
                onClick={() => onChange(opt, true)}
                color="danger"
              >
                Not {opt}
              </EuiFilterButton>
              <EuiFilterButton
                hasActiveFilters={(currFilter?.values ?? []).includes(opt)}
                onClick={() => onChange(opt)}
                color="primary"
              >
                {opt}
              </EuiFilterButton>
            </EuiFilterGroup>
            <EuiSpacer size="s" />
          </Fragment>
        ))}
    </>
  );
};
