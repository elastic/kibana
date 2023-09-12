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
import { useFetchSloList } from '../../hooks/slo/use_fetch_slo_list';
import { useFetchHistoricalSummary } from '../../hooks/slo/use_fetch_historical_summary';

interface Props {
  initialSlo?: SLOWithSummaryResponse;
  onSelected: (slo: SLOWithSummaryResponse | undefined) => void;
  errors?: string[];
}

export function SloSelector({ initialSlo, onSelected, errors }: Props) {
  const [options, setOptions] = useState<Array<EuiComboBoxOptionOption<string>>>([]);
  const [selectedOptions, setSelectedOptions] = useState<Array<EuiComboBoxOptionOption<string>>>();
  const [searchValue, setSearchValue] = useState<string>('');
  const { isLoading, sloList } = useFetchSloList({ kqlQuery: searchValue });
  // const { isLoading: historicalSummaryLoading, data: historicalSummaries = [] } =
  //   useFetchHistoricalSummary({
  //     list: sloList?.results.map((slo) => ({
  //       sloId: slo.id,
  //       instanceId: slo.instanceId ?? ALL_VALUE,
  //     })),
  //   });
  const hasError = errors !== undefined && errors.length > 0;

  useEffect(() => {
    setSelectedOptions(initialSlo ? [{ value: initialSlo.id, label: initialSlo.name }] : []);
  }, [initialSlo]);

  useEffect(() => {
    const isLoadedWithData = !isLoading && sloList!.results !== undefined;
    const opts: Array<EuiComboBoxOptionOption<string>> = isLoadedWithData
      ? sloList!.results!.map((slo) => ({
          value: slo.id,
          label: slo.name,
          instanceId: slo.instanceId,
        }))
      : [];
    // options.map((option) => ({
    //   ...option,
    //   summary: historicalSummaries.find(
    //     (historicalSummary) =>
    //       historicalSummary.sloId === option?.id &&
    //       historicalSummary.instanceId === (option?.instanceId ?? ALL_VALUE)
    //   )?.data,
    // }));
    setOptions(opts);
  }, [isLoading, sloList]);

  const onChange = (opts: Array<EuiComboBoxOptionOption<string>>) => {
    setSelectedOptions(opts);
    const selectedSlo =
      opts.length === 1 ? sloList!.results?.find((slo) => slo.id === opts[0].value) : undefined;
    console.log(selectedSlo, '!!before summary');
    // selectedSlo = {
    //   ...selectedSlo,
    //   summary: historicalSummaries.find(
    //     (historicalSummary) =>
    //       historicalSummary.sloId === selectedSlo?.id &&
    //       historicalSummary.instanceId === (selectedSlo.instanceId ?? ALL_VALUE)
    //   )?.data,
    // };
    console.log(selectedSlo, '!!after summary');
    onSelected(selectedSlo);
  };

  const onSearchChange = useMemo(() => debounce((value: string) => setSearchValue(value), 300), []);
  const rowLabel = i18n.translate('xpack.observability.slo.rules.sloSelector.rowLabel', {
    defaultMessage: 'SLO',
  });
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
