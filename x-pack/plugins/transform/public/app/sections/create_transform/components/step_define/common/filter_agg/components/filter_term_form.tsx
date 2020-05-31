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
import { useApi } from '../../../../../../../hooks';
import { CreateTransformWizardContext } from '../../../../wizard/wizard';
import { FilterAggConfigTerm } from '../types';

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

  const [options, setOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const onSearchChange = useCallback(
    (searchValue) => {
      if (selectedField === undefined) return;

      setIsLoading(true);
      setOptions([]);

      const esSearchRequest = {
        index: indexPattern!.title,
        body: {
          query: {
            wildcard: {
              [selectedField]: {
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

      api.esSearch(esSearchRequest).then((response) => {
        setOptions(
          response.aggregations.field_values.buckets.map(
            (value: { key: string; doc_count: number }) => ({ label: value.key })
          )
        );
        setIsLoading(false);
      });
    },
    [api, indexPattern, selectedField]
  );

  useEffect(() => {
    // Simulate initial load.
    onSearchChange('');
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          onChange({
            config: {
              value: selected[0].label,
            },
          });
        }}
        onSearchChange={debounce(onSearchChange, 600)}
        data-test-subj="filterTermValueSelection"
      />
    </EuiFormRow>
  );
};
