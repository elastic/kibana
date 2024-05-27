/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { find } from 'lodash/fp';
import { EuiCodeBlock, EuiFormRow, EuiComboBox, EuiTextColor } from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useWatch, useFormContext } from 'react-hook-form';
import { QUERIES_DROPDOWN_LABEL, QUERIES_DROPDOWN_SEARCH_FIELD_LABEL } from './constants';
import { OsquerySchemaLink } from '../components/osquery_schema_link';

import { useSavedQueries } from './use_saved_queries';
import type { SavedQuerySO } from '../routes/saved_queries/list';

const euiCodeBlockCss = {
  '.euiCodeBlock__line': {
    whiteSpace: 'nowrap' as const,
  },
};

export interface SavedQueriesDropdownProps {
  disabled?: boolean;
  onChange: (
    value:
      | (Pick<SavedQuerySO, 'id' | 'description' | 'query' | 'ecs_mapping' | 'timeout'> & {
          savedQueryId: string;
        })
      | null
  ) => void;
}

interface SelectedOption {
  label: string;
  value: Pick<SavedQuerySO, 'id' | 'description' | 'query' | 'ecs_mapping'> & {
    savedQueryId: string;
  };
}

const SavedQueriesDropdownComponent: React.FC<SavedQueriesDropdownProps> = ({
  disabled,
  onChange,
}) => {
  const savedQueryId = useWatch({ name: 'savedQueryId' });
  const context = useFormContext();
  const { errors } = context.formState;
  const queryFieldError = errors?.query?.message;
  const [selectedOptions, setSelectedOptions] = useState<SelectedOption[]>([]);

  const { data } = useSavedQueries({});

  const queryOptions = useMemo(
    () =>
      data?.data?.map((savedQuery) => ({
        label: savedQuery.id ?? '',
        value: {
          savedQueryId: savedQuery.id,
          id: savedQuery.id,
          description: savedQuery.description,
          query: savedQuery.query,
          ecs_mapping: savedQuery.ecs_mapping,
        },
      })) ?? [],
    [data]
  );

  const handleSavedQueryChange = useCallback(
    (newSelectedOptions: any) => {
      if (!newSelectedOptions.length) {
        onChange(null);
        setSelectedOptions(newSelectedOptions);

        return;
      }

      const selectedSavedQuery = find(['id', newSelectedOptions[0].value.id], data?.data);

      if (selectedSavedQuery) {
        onChange({ ...selectedSavedQuery, savedQueryId: selectedSavedQuery.id });
      }

      setSelectedOptions(newSelectedOptions);
    },
    [data, onChange]
  );

  const renderOption = useCallback(
    ({ value }: any) => (
      <>
        <strong>{value.id}</strong>
        <div className="eui-textTruncate">
          <EuiTextColor color="subdued">{value.description}</EuiTextColor>
        </div>
        <EuiCodeBlock css={euiCodeBlockCss} language="sql" fontSize="m" paddingSize="s">
          {value.query.split('\n').join(' ')}
        </EuiCodeBlock>
      </>
    ),
    []
  );

  useEffect(() => {
    if (savedQueryId) {
      const savedQueryOption = find(['value.savedQueryId', savedQueryId], queryOptions);

      if (savedQueryOption) {
        setSelectedOptions([savedQueryOption]);
      }
    }
  }, [savedQueryId, queryOptions]);

  useEffect(() => {
    if (selectedOptions.length && selectedOptions[0].value.savedQueryId !== savedQueryId) {
      setSelectedOptions([]);
    }
  }, [savedQueryId, selectedOptions]);

  return (
    <EuiFormRow
      isInvalid={!!queryFieldError}
      error={queryFieldError}
      label={QUERIES_DROPDOWN_SEARCH_FIELD_LABEL}
      labelAppend={<OsquerySchemaLink />}
      fullWidth
    >
      <EuiComboBox
        data-test-subj={'savedQuerySelect'}
        isDisabled={disabled}
        fullWidth
        placeholder={QUERIES_DROPDOWN_LABEL}
        // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
        singleSelection={{ asPlainText: true }}
        options={queryOptions}
        selectedOptions={selectedOptions}
        onChange={handleSavedQueryChange}
        renderOption={renderOption}
        rowHeight={110}
      />
    </EuiFormRow>
  );
};

SavedQueriesDropdownComponent.displayName = 'SavedQueriesDropdown';

export const SavedQueriesDropdown = React.memo(SavedQueriesDropdownComponent);
