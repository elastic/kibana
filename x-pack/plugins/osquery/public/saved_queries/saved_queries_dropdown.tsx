/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { find } from 'lodash/fp';
import { EuiCodeBlock, EuiFormRow, EuiComboBox, EuiTextColor } from '@elastic/eui';
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';
import { SimpleSavedObject } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { useHistory, useLocation } from 'react-router-dom';
import styled from 'styled-components';

import { useSavedQueries } from './use_saved_queries';

export interface SavedQueriesDropdownRef {
  clearSelection: () => void;
}

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

const SavedQueriesDropdownComponent = forwardRef<
  SavedQueriesDropdownRef,
  SavedQueriesDropdownProps
>(({ disabled, onChange }, ref) => {
  const { replace } = useHistory();
  const location = useLocation();
  const [selectedOptions, setSelectedOptions] = useState([]);

  const { data } = useSavedQueries({});

  const queryOptions = useMemo(
    () =>
      data?.savedObjects?.map((savedQuery) => ({
        label: savedQuery.attributes.id ?? '',
        value: {
          savedObjectId: savedQuery.id,
          id: savedQuery.attributes.id,
          description: savedQuery.attributes.description,
          query: savedQuery.attributes.query,
        },
      })) ?? [],
    [data?.savedObjects]
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

  const clearSelection = useCallback(() => setSelectedOptions([]), []);

  useEffect(() => {
    const savedQueryId = location.state?.form?.savedQueryId;

    if (savedQueryId) {
      const savedQueryOption = find(['value.savedObjectId', savedQueryId], queryOptions);

      if (savedQueryOption) {
        handleSavedQueryChange([savedQueryOption]);
      }

      replace({ state: null });
    }
  }, [handleSavedQueryChange, replace, location.state, queryOptions]);

  useImperativeHandle(
    ref,
    () => ({
      clearSelection,
    }),
    [clearSelection]
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
        rowHeight={110}
      />
    </EuiFormRow>
  );
});

export const SavedQueriesDropdown = React.memo(SavedQueriesDropdownComponent);
