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
import { ObservabilityClientPluginsStart } from '../../../../../plugin';
import { useFetcher } from '../../../../..';
import { useKibana } from '../../../../../../../../../src/plugins/kibana_react/public';
import { useIndexPatternContext } from '../../../../../hooks/use_default_index_pattern';
import { useUrlStorage } from '../../hooks/use_url_strorage';
import { UrlFilter } from '../../types';
import { FilterValueButton } from './filter_value_btn';

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

  const {
    services: { data },
  } = useKibana<ObservabilityClientPluginsStart>();

  const { series } = useUrlStorage(seriesId);

  const { data: values, status } = useFetcher<Promise<string[]>>(() => {
    return data.autocomplete.getValueSuggestions({
      indexPattern,
      query: '',
      useTimeRange: false,
      field: { name: field, type: 'string', aggregatable: true },
    });
  }, [field]);

  const filters = series?.filters ?? [];

  const currFilter: UrlFilter | undefined = filters.find(({ field: fd }) => field === fd);

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
      {status === 'loading' && (
        <div style={{ textAlign: 'center' }}>
          <EuiLoadingSpinner />
        </div>
      )}
      {(values || [])
        .filter((opt) => opt.toLowerCase().includes(value.toLowerCase()))
        .map((opt) => (
          <Fragment key={opt}>
            <EuiFilterGroup fullWidth={true} color="primary">
              <FilterValueButton
                field={field}
                value={opt}
                allValues={currFilter?.notValues}
                negate={true}
                nestedField={nestedField}
                seriesId={seriesId}
                isOpen={isOpen}
                setIsOpen={setIsOpen}
              />
              <FilterValueButton
                field={field}
                value={opt}
                allValues={currFilter?.values}
                nestedField={nestedField}
                seriesId={seriesId}
                negate={false}
                isOpen={isOpen}
                setIsOpen={setIsOpen}
              />
            </EuiFilterGroup>
            <EuiSpacer size="s" />
          </Fragment>
        ))}
    </>
  );
}
