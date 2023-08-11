/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, useState, useCallback, useMemo } from 'react';
import { EuiComboBox, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { type SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import { EuiComboBoxOptionOption } from '@elastic/eui/src/components/combo_box/types';
import useMount from 'react-use/lib/useMount';
import { debounce } from 'lodash';
import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';
import { useCancellableSearch } from '../../hooks/use_cancellable_search';
import { useDataSource } from '../../hooks/use_data_source';

export interface PartitionsSelectorProps {
  splitField: string;
  value: string[];
  onChange: (update: string[]) => void;
}

function getQueryPayload(indexPattern: string, fieldName: string, queryString: string = '') {
  return {
    params: {
      index: indexPattern,
      size: 0,
      aggs: {
        aggResults: {
          filter: {
            bool: {
              must: {
                wildcard: {
                  [fieldName]: {
                    value: `*${queryString}*`,
                  },
                },
              },
            },
          },
          aggs: {
            partitionValues: {
              terms: {
                field: fieldName,
              },
            },
          },
        },
      },
    } as SearchRequest,
  };
}

interface PartitionsResponse {
  aggregations: {
    aggResults: {
      partitionValues: { buckets: Array<{ key: string }> };
    };
  };
}

export const PartitionsSelector: FC<PartitionsSelectorProps> = ({
  value,
  onChange,
  splitField,
}) => {
  const { dataView } = useDataSource();
  const {
    notifications: { toasts },
  } = useAiopsAppContext();
  const [options, setOptions] = useState<Array<EuiComboBoxOptionOption<string>>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { runRequest, cancelRequest } = useCancellableSearch();

  const fetchResults = useCallback(
    async (searchValue: string) => {
      cancelRequest();
      setIsLoading(true);
      try {
        const requestPayload = getQueryPayload(dataView.getIndexPattern(), splitField, searchValue);

        const result = await runRequest<typeof requestPayload, { rawResponse: PartitionsResponse }>(
          requestPayload
        );

        if (result === null) {
          setOptions([]);
          return;
        }

        setOptions(
          result.rawResponse.aggregations.aggResults.partitionValues.buckets.map((v) => ({
            value: v.key,
            label: v.key,
          }))
        );
      } catch (e) {
        toasts.addError(e, {
          title: i18n.translate('xpack.aiops.changePointDetection.fetchPartitionsErrorTitle', {
            defaultMessage: 'Failed to fetch partitions',
          }),
        });
      }
      setIsLoading(false);
    },
    [cancelRequest, dataView, splitField, runRequest, toasts]
  );

  useMount(() => {
    fetchResults('');
  });

  const selectedOptions = useMemo<Array<EuiComboBoxOptionOption<string>>>(() => {
    return value.map((v) => ({ value: v, label: v }));
  }, [value]);

  const onChangeCallback = useCallback(
    (udpate: EuiComboBoxOptionOption[]) => {
      onChange(udpate.map((v) => v.value as string));
    },
    [onChange]
  );

  const onSearchChange = useMemo(() => debounce(fetchResults, 500), [fetchResults]);

  return (
    <EuiFormRow
      fullWidth
      label={i18n.translate('xpack.aiops.changePointDetection.partitionsLabel', {
        defaultMessage: 'Partitions',
      })}
    >
      <EuiComboBox<string>
        isLoading={isLoading}
        fullWidth
        compressed
        options={options}
        selectedOptions={selectedOptions}
        onChange={onChangeCallback}
        onSearchChange={onSearchChange}
        isClearable
        data-test-subj="aiopsChangePointPartitions"
      />
    </EuiFormRow>
  );
};
