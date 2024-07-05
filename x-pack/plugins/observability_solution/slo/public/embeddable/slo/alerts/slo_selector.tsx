/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { EuiComboBox, EuiComboBoxOptionOption, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { debounce } from 'lodash';
import { ALL_VALUE, SLOWithSummaryResponse } from '@kbn/slo-schema';
import { useFetchSloList } from '../../../hooks/use_fetch_slo_list';
import { SloItem } from './types';

interface Props {
  initialSlos?: SloItem[];
  onSelected: (slos: SLOWithSummaryResponse[] | SLOWithSummaryResponse | undefined) => void;
  hasError?: boolean;
  singleSelection?: boolean;
}

const SLO_REQUIRED = i18n.translate('xpack.slo.sloEmbeddable.config.errors.sloRequired', {
  defaultMessage: 'SLO is required.',
});
export function SloSelector({ initialSlos, onSelected, hasError, singleSelection }: Props) {
  const mapSlosToOptions = (slos: SloItem[] | SLOWithSummaryResponse[] | undefined) =>
    slos?.map((slo) => ({
      label: slo.instanceId !== ALL_VALUE ? `${slo.name} (${slo.instanceId})` : slo.name,
      value: `${slo.id}-${slo.instanceId}`,
    })) ?? [];
  const [options, setOptions] = useState<Array<EuiComboBoxOptionOption<string>>>([]);
  const [selectedOptions, setSelectedOptions] = useState<Array<EuiComboBoxOptionOption<string>>>(
    mapSlosToOptions(initialSlos)
  );
  const [searchValue, setSearchValue] = useState<string>('');
  const query = `${searchValue}*`;
  const { isLoading, data: sloList } = useFetchSloList({
    kqlQuery: `slo.name: (${query}) or slo.instanceId.text: (${query})`,
    perPage: 100,
  });

  useEffect(() => {
    const isLoadedWithData = !isLoading && sloList?.results !== undefined;
    const opts: Array<EuiComboBoxOptionOption<string>> = isLoadedWithData
      ? mapSlosToOptions(sloList?.results)
      : [];
    setOptions(opts);
  }, [isLoading, sloList]);

  const onChange = (opts: Array<EuiComboBoxOptionOption<string>>) => {
    setSelectedOptions(opts);
    const selectedSlos =
      opts.length >= 1
        ? sloList!.results?.filter((slo) =>
            opts.find((opt) => opt.value === `${slo.id}-${slo.instanceId}`)
          )
        : undefined;
    onSelected(singleSelection ? selectedSlos?.[0] : selectedSlos);
  };

  const onSearchChange = useMemo(
    () =>
      debounce((value: string) => {
        setSearchValue(value);
      }, 300),
    []
  );

  return (
    <EuiFormRow
      fullWidth
      isInvalid={hasError}
      error={hasError ? SLO_REQUIRED : undefined}
      label={i18n.translate('xpack.slo.embeddable.sloSelectorLabel', {
        defaultMessage: 'SLO',
      })}
    >
      <EuiComboBox
        aria-label={i18n.translate('xpack.slo.sloEmbeddable.config.sloSelector.ariaLabel', {
          defaultMessage: 'SLO',
        })}
        placeholder={i18n.translate('xpack.slo.sloEmbeddable.config.sloSelector.placeholder', {
          defaultMessage: 'Select a SLO',
        })}
        data-test-subj="sloSelector"
        options={options}
        selectedOptions={selectedOptions}
        async
        isLoading={isLoading}
        onChange={onChange}
        fullWidth
        onSearchChange={onSearchChange}
        isInvalid={hasError}
        singleSelection={singleSelection ? { asPlainText: true } : undefined}
      />
    </EuiFormRow>
  );
}
