/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useContext, useEffect, useState } from 'react';
import { EuiComboBox, EuiFormRow } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { debounce } from 'lodash';
import { useUpdateEffect } from 'react-use';
import { i18n } from '@kbn/i18n';
import { useApi } from '../../../../../../../hooks';
import { CreateTransformWizardContext } from '../../../../wizard/wizard';
import { FilterAggConfigTerm } from '../types';
import { useToastNotifications } from '../../../../../../../app_dependencies';

/**
 * Form component for the term filter aggregation.
 */
export const FilterTermForm: FilterAggConfigTerm['aggTypeConfig']['FilterAggFormComponent'] = ({
  config,
  onChange,
  selectedField,
}) => {
  const api = useApi();
  const { indexPattern } = useContext(CreateTransformWizardContext);
  const toastNotifications = useToastNotifications();

  const [options, setOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  const fetchOptions = useCallback(
    debounce(async (searchValue: string) => {
      const esSearchRequest = {
        index: indexPattern!.title,
        body: {
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

      try {
        const response = await api.esSearch(esSearchRequest);
        setOptions(
          response.aggregations.field_values.buckets.map(
            (value: { key: string; doc_count: number }) => ({ label: value.key })
          )
        );
      } catch (e) {
        toastNotifications.addWarning(
          i18n.translate('xpack.transform.agg.popoverForm.filerAgg.term.errorFetchSuggestions', {
            defaultMessage: 'Unable to fetch suggestions',
          })
        );
      }

      setIsLoading(false);
    }, 600),
    [selectedField]
  );

  const onSearchChange = useCallback(
    async (searchValue) => {
      if (selectedField === undefined) return;

      setIsLoading(true);
      setOptions([]);

      await fetchOptions(searchValue);
    },
    [fetchOptions, selectedField]
  );

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
    // Simulate initial load.
    onSearchChange('');
    return () => {
      // make sure the ongoing request is canceled
      fetchOptions.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
