/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { find } from 'lodash/fp';
import { EuiCodeBlock, EuiSuperSelect, EuiText } from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import { useQuery } from 'react-query';

import { useKibana } from '../common/lib/kibana';

interface SavedQueriesDropdownProps {
  disabled?: boolean;
  onChange: (value: string) => void;
}

const SavedQueriesDropdownComponent: React.FC<SavedQueriesDropdownProps> = ({
  disabled,
  onChange,
}) => {
  const [selectedSavedQueryId, setSelectedSavedQueryId] = useState<string | null>(null);

  const { http } = useKibana().services;
  const { data } = useQuery('savedQueryList', () =>
    http.get('/internal/osquery/saved_query', {
      query: {
        pageIndex: 0,
        pageSize: 100,
        sortField: 'updated_at',
        sortDirection: 'desc',
      },
    })
  );

  const queryOptions =
    // @ts-expect-error update types
    data?.saved_objects.map((savedQuery) => ({
      value: savedQuery,
      inputDisplay: savedQuery.attributes.name,
      dropdownDisplay: (
        <>
          <strong>{savedQuery.attributes.name}</strong>
          <EuiText size="s" color="subdued">
            <p className="euiTextColor--subdued">{savedQuery.attributes.description}</p>
          </EuiText>
          <EuiCodeBlock language="sql" fontSize="s" paddingSize="s">
            {savedQuery.attributes.query}
          </EuiCodeBlock>
        </>
      ),
    })) ?? [];

  const handleSavedQueryChange = useCallback(
    (newValue) => {
      onChange({
        id: newValue.id,
        ...newValue.attributes,
      });
      setSelectedSavedQueryId(newValue.id);
    },
    [onChange]
  );

  return (
    <EuiSuperSelect
      disabled={disabled}
      fullWidth
      valueOfSelected={find(['id', selectedSavedQueryId], data?.saved_objects)}
      options={queryOptions}
      onChange={handleSavedQueryChange}
    />
  );
};

export const SavedQueriesDropdown = React.memo(SavedQueriesDropdownComponent);
