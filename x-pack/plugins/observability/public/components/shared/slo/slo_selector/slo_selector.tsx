/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { debounce } from 'lodash';
import React, { useEffect, useMemo, useState } from 'react';

import { SLO } from '../../../../typings';
import { useFetchSloList } from '../../../../hooks/slo/use_fetch_slo_list';

interface Props {
  onSelected: (slo: SLO | undefined) => void;
}

function SloSelector({ onSelected }: Props) {
  const [options, setOptions] = useState<Array<EuiComboBoxOptionOption<string>>>([]);
  const [selectedOptions, setSelectedOptions] = useState<Array<EuiComboBoxOptionOption<string>>>();
  const [searchValue, setSearchValue] = useState<string>('');
  const { loading, sloList } = useFetchSloList(searchValue);

  useEffect(() => {
    const isLoadedWithData = !loading && sloList !== undefined;
    const opts: Array<EuiComboBoxOptionOption<string>> = isLoadedWithData
      ? sloList.results.map((slo) => ({ value: slo.id, label: slo.name }))
      : [];
    setOptions(opts);
  }, [loading, sloList]);

  const onChange = (opts: Array<EuiComboBoxOptionOption<string>>) => {
    setSelectedOptions(opts);
    const selectedSlo =
      opts.length === 1 ? sloList.results.find((slo) => slo.id === opts[0].value) : undefined;
    onSelected(selectedSlo);
  };

  const onSearchChange = useMemo(() => debounce((value: string) => setSearchValue(value), 300), []);

  return (
    <EuiComboBox
      aria-label={i18n.translate('xpack.observability.slo.sloSelector.ariaLabel', {
        defaultMessage: 'SLO Selector',
      })}
      placeholder={i18n.translate('xpack.observability.slo.sloSelector.placeholder', {
        defaultMessage: 'Select a SLO',
      })}
      data-test-subj="sloSelector"
      singleSelection={{ asPlainText: true }}
      options={options}
      selectedOptions={selectedOptions}
      async
      isLoading={loading}
      onChange={onChange}
      fullWidth
      onSearchChange={onSearchChange}
    />
  );
}

export { SloSelector };
export type { Props as SloSelectorProps };
