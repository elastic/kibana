/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBox, EuiComboBoxOptionOption, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SLOResponse } from '@kbn/slo-schema';
import { debounce } from 'lodash';
import React, { useEffect, useMemo, useState } from 'react';

import { useFetchSloList } from '../../hooks/slo/use_fetch_slo_list';

interface Props {
  initialSlo?: SLOResponse;
  errors?: string[];
  onSelected: (slo: SLOResponse | undefined) => void;
}

function SloSelector({ initialSlo, onSelected, errors }: Props) {
  const [options, setOptions] = useState<Array<EuiComboBoxOptionOption<string>>>([]);
  const [selectedOptions, setSelectedOptions] = useState<Array<EuiComboBoxOptionOption<string>>>();
  const [searchValue, setSearchValue] = useState<string>('');
  const { isLoading, sloList } = useFetchSloList({ name: searchValue });
  const hasError = errors !== undefined && errors.length > 0;

  useEffect(() => {
    setSelectedOptions(initialSlo ? [{ value: initialSlo.id, label: initialSlo.name }] : []);
  }, [initialSlo]);

  useEffect(() => {
    const isLoadedWithData = !isLoading && sloList !== undefined;
    const opts: Array<EuiComboBoxOptionOption<string>> = isLoadedWithData
      ? sloList.results.map((slo) => ({ value: slo.id, label: slo.name }))
      : [];
    setOptions(opts);
  }, [isLoading, sloList]);

  const onChange = (opts: Array<EuiComboBoxOptionOption<string>>) => {
    setSelectedOptions(opts);
    const selectedSlo =
      opts.length === 1 ? sloList?.results.find((slo) => slo.id === opts[0].value) : undefined;
    onSelected(selectedSlo);
  };

  const onSearchChange = useMemo(() => debounce((value: string) => setSearchValue(value), 300), []);

  return (
    <EuiFormRow
      label={rowLabel}
      fullWidth
      isInvalid={hasError}
      error={hasError ? errors[0] : undefined}
    >
      <EuiComboBox
        aria-label={i18n.translate('xpack.observability.slo.rules.sloSelector.ariaLabel', {
          defaultMessage: 'SLO',
        })}
        placeholder={i18n.translate('xpack.observability.slo.rules.sloSelector.placeholder', {
          defaultMessage: 'Select a SLO',
        })}
        data-test-subj="sloSelector"
        singleSelection={{ asPlainText: true }}
        options={options}
        selectedOptions={selectedOptions}
        async
        isLoading={isLoading}
        onChange={onChange}
        fullWidth
        onSearchChange={onSearchChange}
        isInvalid={hasError}
      />
    </EuiFormRow>
  );
}

const rowLabel = i18n.translate('xpack.observability.slo.rules.sloSelector.rowLabel', {
  defaultMessage: 'SLO',
});

export { SloSelector };
export type { Props as SloSelectorProps };
