/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiComboBox, EuiComboBoxOptionOption, EuiCopy } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { get } from 'lodash';
import React, { useEffect, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
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
  const { search: searchParams, pathname } = useLocation();
  const history = useHistory();

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
    const newValue = selected[0].value;
    if (!newValue) return;
    setSelected(newValue);

    const groups = [slo.groupBy].flat();
    const newInstanceValues = groups.map((group) => {
      return group === groupingKey ? newValue : get(slo.groupings, group);
    });

    const urlSearchParams = new URLSearchParams(searchParams);
    urlSearchParams.set('instanceId', newInstanceValues.join(','));
    history.replace({
      pathname,
      search: urlSearchParams.toString(),
    });
  };

  return (
    <EuiComboBox<string>
      fullWidth={false}
      isClearable={false}
      compressed
      prepend={groupingKey}
      append={
        currSelected ? (
          <EuiCopy textToCopy={currSelected}>
            {(copy) => (
              <EuiButtonIcon
                data-test-subj="sloSLOGroupingValueSelectorButton"
                color="text"
                iconType="copyClipboard"
                onClick={copy}
                aria-label={i18n.translate('xpack.slo.sLOGroupingValueSelector.copyButton.label', {
                  defaultMessage: 'Copy value to clipboard',
                })}
              />
            )}
          </EuiCopy>
        ) : (
          <EuiButtonIcon
            data-test-subj="sloSLOGroupingValueSelectorButton"
            color="text"
            disabled={true}
            iconType="copyClipboard"
            aria-label={i18n.translate(
              'xpack.slo.sLOGroupingValueSelector.copyButton.noValueLabel',
              { defaultMessage: 'Select a value before' }
            )}
          />
        )
      }
      singleSelection={{ asPlainText: true }}
      options={options}
      isLoading={isLoading}
      isDisabled={isError}
      placeholder={i18n.translate('xpack.slo.sLOGroupingValueSelector.placeholder', {
        defaultMessage: 'Select a group value',
      })}
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
