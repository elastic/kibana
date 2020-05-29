/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { EuiComboBox, EuiFormRow } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { debounce } from 'lodash';
import { useApi } from '../../../../../../../hooks';
import { CreateTransformWizardContext } from '../../../../wizard/wizard';
import { requiredValidator } from '../../../../../../../../../../ml/common/util/validators';
import { FilterAggConfigTerm } from '../types';

/**
 * Form component for the term filter aggregation.
 */
export const FilterTermForm: FilterAggConfigTerm['aggTypeConfig']['FilterAggFormComponent'] = ({
  config,
  validationResult,
  onChange,
  selectedField,
}) => {
  const api = useApi();
  const { indexPattern } = useContext(CreateTransformWizardContext);

  const [options, setOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const validators = useMemo(() => requiredValidator(), []);

  const onSearchChange = useCallback(
    (searchValue) => {
      setIsLoading(true);
      setOptions([]);

      const esSearchRequest = {
        index: indexPattern!.title,
        body: {
          query: {
            wildcard: {
              region: {
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
  }, [onSearchChange]);

  const selectedOptions = config?.value ? [{ label: config.value }] : undefined;

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
            validationResult: validators(selected[0].label),
          });
        }}
        onSearchChange={debounce(onSearchChange, 600)}
        data-test-subj="filterTermValueSelection"
      />
    </EuiFormRow>
  );
};
