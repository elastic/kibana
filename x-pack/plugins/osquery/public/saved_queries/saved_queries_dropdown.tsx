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
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import styled from 'styled-components';
import deepEqual from 'fast-deep-equal';

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

const SavedQueriesDropdownComponent: React.FC<SavedQueriesDropdownProps> = ({
  disabled,
  onChange,
}) => {
  const [selectedOptions, setSelectedOptions] = useState([]);

  // eslint-disable-next-line @typescript-eslint/naming-convention
  const [{ query, ecs_mapping, savedQueryId }] = useFormData({
    watch: ['ecs_mapping', 'query', 'savedQueryId'],
  });

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
        handleSavedQueryChange([savedQueryOption]);
      }
    }
  }, [savedQueryId, handleSavedQueryChange, queryOptions]);

  useEffect(() => {
    if (
      selectedOptions.length &&
      // @ts-expect-error update types
      (selectedOptions[0].value.savedQueryId !== savedQueryId ||
        // @ts-expect-error update types
        selectedOptions[0].value.query !== query ||
        // @ts-expect-error update types
        !deepEqual(selectedOptions[0].value.ecs_mapping, ecs_mapping))
    ) {
      setSelectedOptions([]);
    }
  }, [ecs_mapping, query, savedQueryId, selectedOptions]);

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
};

export const SavedQueriesDropdown = React.memo(SavedQueriesDropdownComponent);
