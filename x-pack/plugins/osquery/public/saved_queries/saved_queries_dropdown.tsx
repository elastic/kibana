/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { find } from 'lodash/fp';
import { EuiCodeBlock, EuiFormRow, EuiComboBox, EuiTextColor } from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SimpleSavedObject } from '@kbn/core/public';
import styled from 'styled-components';
import { QUERIES_DROPDOWN_LABEL, QUERIES_DROPDOWN_SEARCH_FIELD_LABEL } from './constants';
import { OsquerySchemaLink } from '../components/osquery_schema_link';

import { useSavedQueries } from './use_saved_queries';
import { useFormData } from '../shared_imports';

const TextTruncate = styled.div`
  overflow: hidden;
  text-overflow: ellipsis;
`;

const StyledEuiCodeBlock = styled(EuiCodeBlock)`
  .euiCodeBlock__line {
    white-space: nowrap;
  }
`;

interface SavedQueriesDropdownProps {
  disabled?: boolean;
  onChange: (
    value:
      | SimpleSavedObject<{
          id: string;
          description?: string | undefined;
          query: string;
        }>['attributes']
      | null
  ) => void;
}

interface SelectedOption {
  label: string;
  value: {
    savedQueryId: string;
    id: string;
    description: string;
    query: string;
    ecs_mapping: Record<string, unknown>;
  };
}

const SavedQueriesDropdownComponent: React.FC<SavedQueriesDropdownProps> = ({
  disabled,
  onChange,
}) => {
  const [selectedOptions, setSelectedOptions] = useState<SelectedOption[]>([]);

  const [{ savedQueryId }] = useFormData();

  const { data } = useSavedQueries({});

  const queryOptions = useMemo(
    () =>
      // @ts-expect-error update types
      data?.saved_objects?.map((savedQuery) => ({
        label: savedQuery.attributes.id ?? '',
        value: {
          savedQueryId: savedQuery.id,
          id: savedQuery.attributes.id,
          description: savedQuery.attributes.description,
          query: savedQuery.attributes.query,
          ecs_mapping: savedQuery.attributes.ecs_mapping,
        },
      })) ?? [],
    [data?.saved_objects]
  );

  const handleSavedQueryChange = useCallback(
    (newSelectedOptions) => {
      if (!newSelectedOptions.length) {
        onChange(null);
        setSelectedOptions(newSelectedOptions);

        return;
      }

      const selectedSavedQuery = find(
        ['attributes.id', newSelectedOptions[0].value.id],
        data?.saved_objects
      );

      if (selectedSavedQuery) {
        onChange({ ...selectedSavedQuery.attributes, savedQueryId: selectedSavedQuery.id });
      }

      setSelectedOptions(newSelectedOptions);
    },
    [data?.saved_objects, onChange]
  );

  const renderOption = useCallback(
    ({ value }) => (
      <>
        <strong>{value.id}</strong>
        <TextTruncate>
          <EuiTextColor color="subdued">{value.description}</EuiTextColor>
        </TextTruncate>
        <StyledEuiCodeBlock language="sql" fontSize="m" paddingSize="s">
          {value.query.split('\n').join(' ')}
        </StyledEuiCodeBlock>
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
      label={QUERIES_DROPDOWN_SEARCH_FIELD_LABEL}
      labelAppend={<OsquerySchemaLink />}
      fullWidth
    >
      <EuiComboBox
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
