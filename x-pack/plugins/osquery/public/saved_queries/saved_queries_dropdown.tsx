/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { find } from 'lodash/fp';
import { EuiCodeBlock, EuiFormRow, EuiComboBox, EuiSuperSelect, EuiText } from '@elastic/eui';
import React, { useCallback, useState } from 'react';

import { useSavedQueries } from './use_saved_queries';

interface SavedQueriesDropdownProps {
  disabled?: boolean;
  onChange: (value: string) => void;
}

const SavedQueriesDropdownComponent: React.FC<SavedQueriesDropdownProps> = ({
  disabled,
  onChange,
}) => {
  const [selectedOptions, setSelectedOptions] = useState([]);

  const { data } = useSavedQueries({});

  const queryOptions =
    data?.savedObjects?.map((savedQuery) => ({
      label: savedQuery.attributes.id ?? '',
      value: {
        id: savedQuery.attributes.id,
        description: savedQuery.attributes.description,
        query: savedQuery.attributes.query,
      },
    })) ?? [];

  const handleSavedQueryChange = useCallback(
    (selectedOptions) => {
      const selectedSavedQuery = find(
        ['attributes.id', selectedOptions[0].value.id],
        data?.savedObjects
      );

      if (selectedSavedQuery) {
        onChange(selectedSavedQuery.attributes);
      }
      setSelectedOptions(selectedOptions);
    },
    [data?.savedObjects, onChange]
  );

  const renderOption = useCallback(
    ({ value }) => (
      <>
        <strong>{value.id}</strong>
        <EuiText size="s" color="subdued">
          <p className="euiTextColor--subdued">{value.description}</p>
        </EuiText>
        <EuiCodeBlock language="sql" fontSize="m" paddingSize="s">
          {value.query}
        </EuiCodeBlock>
      </>
    ),
    []
  );

  return (
    <EuiFormRow label="Build from a saved query (optional)" fullWidth>
      <EuiComboBox
        fullWidth
        placeholder="Select a single option"
        // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
        singleSelection={{ asPlainText: true }}
        options={queryOptions}
        selectedOptions={selectedOptions}
        onChange={handleSavedQueryChange}
        renderOption={renderOption}
        rowHeight={90}
      />
    </EuiFormRow>
  );
};

export const SavedQueriesDropdown = React.memo(SavedQueriesDropdownComponent);
