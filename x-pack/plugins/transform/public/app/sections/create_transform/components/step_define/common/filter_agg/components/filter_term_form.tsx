/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { debounce } from 'lodash';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import useUpdateEffect from 'react-use/lib/useUpdateEffect';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { EuiComboBox, EuiComboBoxOptionOption, EuiFormRow } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { useDataSearch } from '../../../../../../../hooks/use_data_search';
import {
  isEsSearchResponseWithAggregations,
  isMultiBucketAggregate,
} from '../../../../../../../../../common/api_schemas/type_guards';
import { CreateTransformWizardContext } from '../../../../wizard/wizard';
import { useToastNotifications } from '../../../../../../../app_dependencies';

import { FilterAggConfigTerm } from '../types';

/**
 * Form component for the term filter aggregation.
 */
export const FilterTermForm: FilterAggConfigTerm['aggTypeConfig']['FilterAggFormComponent'] = ({
  config,
  onChange,
  selectedField,
}) => {
  const { dataView, runtimeMappings } = useContext(CreateTransformWizardContext);
  const dataSearch = useDataSearch();
  const toastNotifications = useToastNotifications();

  const [options, setOptions] = useState<EuiComboBoxOptionOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchValue, setSearchValue] = useState('');

  const onSearchChange = (newSearchValue: string) => {
    setSearchValue(newSearchValue);
  };

  const updateConfig = useCallback(
    (update) => {
      onChange({
        config: {
          ...config,
          ...update,
        },
      });
    },
    [config, onChange]
  );

  useEffect(() => {
    const abortController = new AbortController();

    const fetchOptions = debounce(async () => {
      if (selectedField === undefined) return;

      setIsLoading(true);
      setOptions([]);

      const esSearchRequest = {
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
      };

      const response = await dataSearch(esSearchRequest, abortController.signal);

      setIsLoading(false);

      if (
        !(
          isEsSearchResponseWithAggregations(response) &&
          isMultiBucketAggregate<estypes.AggregationsSignificantLongTermsBucket>(
            response.aggregations.field_values
          )
        )
      ) {
        toastNotifications.addWarning(
          i18n.translate('xpack.transform.agg.popoverForm.filerAgg.term.errorFetchSuggestions', {
            defaultMessage: 'Unable to fetch suggestions',
          })
        );
        return;
      }

      setOptions(
        (
          response.aggregations.field_values
            .buckets as estypes.AggregationsSignificantLongTermsBucket[]
        ).map((value) => ({ label: value.key + '' }))
      );
    }, 600);

    fetchOptions();

    return () => {
      // make sure the ongoing request is canceled
      fetchOptions.cancel();
      abortController.abort();
    };
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [selectedField]);

  useEffect(() => {
    // Simulate initial load.
    onSearchChange('');
  }, []);

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
        onSearchChange={onSearchChange}
        data-test-subj="transformFilterTermValueSelector"
      />
    </EuiFormRow>
  );
};
