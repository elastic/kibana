/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React, { useEffect, useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import { useFetchSloInstances } from '../../hooks/use_fetch_slo_instances';

interface Props {
  slo: SLOWithSummaryResponse;
  groupingKey: string;
  value?: string;
}

interface Field {
  label: string;
  value: string;
}

export function SLOGroupingValueSelector({ slo, groupingKey, value }: Props) {
  const [currSelected, setSelected] = useState<string | undefined>(value);
  const [options, setOptions] = useState<Field[]>([]);
  const [search, setSearch] = useState<string | undefined>(undefined);
  const [debouncedSearch, setDebouncedSearch] = useState<string | undefined>(undefined);
  useDebounce(() => setDebouncedSearch(search), 500, [search]);

  const {
    isLoading,
    isError,
    data: instances,
  } = useFetchSloInstances({ sloId: slo.id, groupingKey, search: debouncedSearch });

  useEffect(() => {
    if (instances) {
      const groupingValues = instances.results.find(
        (grouping) => grouping.groupingKey === groupingKey
      )?.values;
      if (groupingValues) {
        setOptions(groupingValues.map(toField));
      }
    }
  }, [groupingKey, instances]);

  const onChange = (selected: Array<EuiComboBoxOptionOption<string>>) => {
    setSelected(selected[0].value!);
  };

  return (
    <EuiComboBox<string>
      fullWidth={false}
      isClearable={false}
      compressed
      prepend={groupingKey}
      singleSelection={{ asPlainText: true }}
      options={options}
      isLoading={isLoading}
      isDisabled={isError}
      placeholder="Select an instance value"
      selectedOptions={currSelected ? [toField(currSelected)] : []}
      onChange={onChange}
      truncationProps={{
        truncation: 'end',
      }}
      onSearchChange={(searchValue: string) => {
        setSearch(searchValue);
      }}
    />
  );
}

function toField(value: string): Field {
  return { label: value, value };
}
