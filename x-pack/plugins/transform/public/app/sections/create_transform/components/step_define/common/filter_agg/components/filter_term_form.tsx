/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { debounce } from 'lodash';
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import useUpdateEffect from 'react-use/lib/useUpdateEffect';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox, EuiFormRow } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { isMultiBucketAggregate } from '@kbn/ml-agg-utils';

import { useDataSearch } from '../../../../../../../hooks/use_data_search';
import { CreateTransformWizardContext } from '../../../../wizard/wizard';
import { useToastNotifications } from '../../../../../../../app_dependencies';

import type { FilterAggConfigTerm } from '../types';

/**
 * Form component for the term filter aggregation.
 */
export const FilterTermForm: FilterAggConfigTerm['aggTypeConfig']['FilterAggFormComponent'] = ({
  config,
  onChange,
  selectedField,
}) => {
  const { dataView, runtimeMappings } = useContext(CreateTransformWizardContext);
  const toastNotifications = useToastNotifications();

  const [searchValue, setSearchValue] = useState('');
  const debouncedOnSearchChange = useMemo(
    () => debounce((d: string) => setSearchValue(d), 600),
    []
  );

  useEffect(() => {
    // Simulate initial load.
    debouncedOnSearchChange('');
    // Cancel debouncing when unmounting
    return () => debouncedOnSearchChange.cancel();
    // Only call on mount
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  const updateConfig = useCallback(
    (update: any) => {
      onChange({
        config: {
          ...config,
          ...update,
        },
      });
    },
    [config, onChange]
  );

  const { data, isError, isLoading } = useDataSearch(
    {
      index: dataView!.title,
      body: {
        ...(runtimeMappings !== undefined ? { runtime_mappings: runtimeMappings } : {}),
        query: {
          wildcard: {
            [selectedField!]: {
              value: `*${searchValue}*`,
            },
          },
        },
        aggs: {
          field_values: {
            terms: {
              field: selectedField,
              size: 10,
            },
          },
        },
        size: 0,
      },
    },
    // Check whether fetching should be enabled
    selectedField !== undefined
  );

  useEffect(() => {
    if (isError) {
      toastNotifications.addWarning(
        i18n.translate('xpack.transform.agg.popoverForm.filerAgg.term.errorFetchSuggestions', {
          defaultMessage: 'Unable to fetch suggestions',
        })
      );
    }
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [isError]);

  const options: EuiComboBoxOptionOption[] =
    isMultiBucketAggregate<estypes.AggregationsSignificantLongTermsBucket>(
      data?.aggregations?.field_values
    )
      ? (
          data?.aggregations?.field_values
            .buckets as estypes.AggregationsSignificantLongTermsBucket[]
        ).map((value) => ({ label: value.key + '' }))
      : [];

  useUpdateEffect(() => {
    // Reset value control on field change
    if (!selectedField) return;
    onChange({
      config: {
        value: undefined,
      },
    });
  }, [selectedField]);

  const selectedOptions = config?.value ? [{ label: config.value }] : undefined;

  if (selectedField === undefined) return null;

  return (
    <EuiFormRow
      label={
        <FormattedMessage
          id="xpack.transform.agg.popoverForm.filerAgg.term.valueLabel"
          defaultMessage="Value"
        />
      }
    >
      <EuiComboBox
        async
        isLoading={isLoading}
        fullWidth
        singleSelection={{ asPlainText: true }}
        options={options}
        selectedOptions={selectedOptions}
        isClearable={false}
        onChange={(selected) => {
          updateConfig({ value: selected.length > 0 ? selected[0].label : undefined });
        }}
        onCreateOption={(value) => {
          updateConfig({ value });
        }}
        onSearchChange={debouncedOnSearchChange}
        data-test-subj="transformFilterTermValueSelector"
      />
    </EuiFormRow>
  );
};
