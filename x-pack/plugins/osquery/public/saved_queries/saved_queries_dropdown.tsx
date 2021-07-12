/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { find } from 'lodash/fp';
import { EuiCodeBlock, EuiFormRow, EuiComboBox, EuiText } from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import { SimpleSavedObject } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { useSavedQueries } from './use_saved_queries';

interface SavedQueriesDropdownProps {
  disabled?: boolean;
  onChange: (
    value: SimpleSavedObject<{
      id: string;
      description?: string | undefined;
      query: string;
    }>['attributes']
  ) => void;
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
    (newSelectedOptions) => {
      const selectedSavedQuery = find(
        ['attributes.id', newSelectedOptions[0].value.id],
        data?.savedObjects
      );

      if (selectedSavedQuery) {
        onChange(selectedSavedQuery.attributes);
      }
      setSelectedOptions(newSelectedOptions);
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
    <EuiFormRow
      label={
        <FormattedMessage
          id="xpack.osquery.savedQueries.dropdown.searchFieldLabel"
          defaultMessage="Build from a saved query (optional)"
        />
      }
      fullWidth
    >
      <EuiComboBox
        isDisabled={disabled}
        fullWidth
        placeholder={i18n.translate('xpack.osquery.savedQueries.dropdown.searchFieldPlaceholder', {
          defaultMessage: 'Search for saved queries',
        })}
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
