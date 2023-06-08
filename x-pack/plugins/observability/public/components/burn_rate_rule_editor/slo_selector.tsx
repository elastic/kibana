/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBox, EuiComboBoxOptionOption, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  CompositeSLOResponse,
  FindCompositeSLOResponse,
  FindSLOResponse,
  SLOResponse,
} from '@kbn/slo-schema';
import { debounce } from 'lodash';
import React, { useEffect, useMemo, useState } from 'react';

import { useFetchSloList } from '../../hooks/slo/use_fetch_slo_list';
import { useFetchCompositeSloList } from '../../hooks/composite_slo/use_fetch_composite_slo_list';

interface Props {
  initialSlo?: SLOResponse | CompositeSLOResponse | null;
  errors?: string[];
  onSelected: (slo: SLOResponse | CompositeSLOResponse | null | undefined) => void;
}

function SloSelector({ initialSlo, onSelected, errors }: Props) {
  const [options, setOptions] = useState<Array<EuiComboBoxOptionOption<string>>>([]);
  const [selectedOptions, setSelectedOptions] = useState<Array<EuiComboBoxOptionOption<string>>>();
  const [searchValue, setSearchValue] = useState<string>('');
  const { isLoading, sloList } = useFetchSloList({ name: searchValue });
  const { isLoading: isCompositeLoading, sloList: compositeSloList } = useFetchCompositeSloList({
    name: searchValue,
  });
  const hasError = errors !== undefined && errors.length > 0;

  useEffect(() => {
    setSelectedOptions(initialSlo ? [{ value: initialSlo.id, label: initialSlo.name }] : []);
  }, [initialSlo]);

  useEffect(() => {
    const isLoadedWithData =
      !isLoading && sloList !== undefined && !isCompositeLoading && compositeSloList !== undefined;
    const opts: Array<EuiComboBoxOptionOption<string>> = isLoadedWithData
      ? createSloOptions(sloList, compositeSloList)
      : [];
    setOptions(opts);
  }, [compositeSloList, isCompositeLoading, isLoading, sloList]);

  const onChange = (opts: Array<EuiComboBoxOptionOption<string>>) => {
    setSelectedOptions(opts);
    const results = [
      ...((sloList && sloList.results) || []),
      ...((compositeSloList && compositeSloList.results) || []),
    ];
    const selectedSlo =
      opts.length === 1 ? results.find((slo) => slo.id === opts[0].value) : undefined;
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

function createSloOptions(sloList: FindSLOResponse, compositeSloList: FindCompositeSLOResponse) {
  const options = [];
  const sloOptions = sloList.results.map((slo) => ({ value: slo.id, label: slo.name }));
  const compositeSloOptions = compositeSloList.results.map((slo) => ({
    value: slo.id,
    label: slo.name,
  }));
  if (sloOptions.length > 0 && compositeSloOptions.length > 0) {
    options.push({
      label: i18n.translate(
        'xpack.observability.slo.rules.sloSelector.compositeSloOptionsListLabel',
        {
          defaultMessage: 'Composite SLOs',
        }
      ),
      options: compositeSloOptions,
    });
    options.push({
      label: i18n.translate('xpack.observability.slo.rules.sloSelector.sloOptionsListLabel', {
        defaultMessage: 'SLOs',
      }),
      options: sloOptions,
    });
  }
  if (sloOptions.length > 0 && compositeSloOptions.length === 0) {
    return sloOptions;
  }
  if (sloOptions.length === 0 && compositeSloOptions.length > 0) {
    return compositeSloOptions;
  }
  return options;
}

export { SloSelector };
export type { Props as SloSelectorProps };
