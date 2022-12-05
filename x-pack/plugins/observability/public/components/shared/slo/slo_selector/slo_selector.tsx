/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';
import { debounce } from 'lodash';
import React, { useEffect, useMemo, useState } from 'react';

import { useFetchSloList } from '../../../../hooks/slo/use_fetch_slo_list';

export function SloSelector() {
  const [options, setOptions] = useState<Array<EuiComboBoxOptionOption<string>>>([]);
  const [selectedOptions, setSelected] = useState<Array<EuiComboBoxOptionOption<string>>>();
  const [searchValue, setSearchValue] = useState<string>('');
  const [loading, sloList] = useFetchSloList(searchValue);

  useEffect(() => {
    if (!loading && sloList !== undefined) {
      const opts = sloList.results.map((result) => ({ value: result.id, label: result.name }));
      setOptions(opts);
    }
  }, [loading, sloList]);

  const onChange = (opts: Array<EuiComboBoxOptionOption<string>>) => {
    setSelected(opts);
  };

  const onSearchChange = useMemo(() => debounce((value: string) => setSearchValue(value), 300), []);

  return (
    <EuiComboBox
      aria-label="SLO selector"
      placeholder="Select a SLO"
      data-test-subj="sloSelector"
      singleSelection={{ asPlainText: true }}
      options={options}
      selectedOptions={selectedOptions}
      async
      isLoading={loading}
      onChange={onChange}
      onSearchChange={onSearchChange}
    />
  );
}
