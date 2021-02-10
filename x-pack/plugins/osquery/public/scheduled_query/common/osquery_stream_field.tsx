/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { find } from 'lodash/fp';
import {
  EuiButtonIcon,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiHorizontalRule,
} from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { useQuery } from 'react-query';

import { useKibana } from '../../common/lib/kibana';

// @ts-expect-error update types
const OsqueryStreamFieldComponent = ({ field, removeItem }) => {
  const { http } = useKibana().services;
  const { data: { saved_objects: savedQueries } = {} } = useQuery(['savedQueryList'], () =>
    http.get('/internal/osquery/saved_query', {
      query: { pageIndex: 0, pageSize: 100, sortField: 'updated_at', sortDirection: 'desc' },
    })
  );

  const { setValue } = field;

  const savedQueriesOptions = useMemo(
    () =>
      // @ts-expect-error update types
      (savedQueries ?? []).map((savedQuery) => ({
        text: savedQuery.attributes.title,
        value: savedQuery.id,
      })),
    [savedQueries]
  );

  const handleSavedQueryChange = useCallback(
    (event) => {
      event.persist();
      const savedQueryId = event.target.value;
      const savedQuery = find(['id', savedQueryId], savedQueries);

      if (savedQuery) {
        // @ts-expect-error update types
        setValue((prev) => ({
          ...prev,
          vars: {
            ...prev.vars,
            id: {
              ...prev.vars.id,
              value: savedQuery.id,
            },
            query: {
              ...prev.vars.query,
              value: savedQuery.attributes.command,
            },
          },
        }));
      }
    },
    [savedQueries, setValue]
  );

  const handleEnabledChange = useCallback(() => {
    // @ts-expect-error update types
    setValue((prev) => ({
      ...prev,
      enabled: !prev.enabled,
    }));
  }, [setValue]);

  const handleQueryChange = useCallback(
    (event) => {
      event.persist();
      // @ts-expect-error update types
      setValue((prev) => ({
        ...prev,
        vars: {
          ...prev.vars,
          query: {
            ...prev.vars.query,
            value: event.target.value,
          },
        },
      }));
    },
    [setValue]
  );

  const handleIntervalChange = useCallback(
    (event) => {
      event.persist();
      // @ts-expect-error update types
      setValue((prev) => ({
        ...prev,
        vars: {
          ...prev.vars,
          interval: {
            ...prev.vars.interval,
            value: event.target.value,
          },
        },
      }));
    },
    [setValue]
  );

  const handleIdChange = useCallback(
    (event) => {
      event.persist();
      // @ts-expect-error update types
      setValue((prev) => ({
        ...prev,
        vars: {
          ...prev.vars,
          id: {
            ...prev.vars.id,
            value: event.target.value,
          },
        },
      }));
    },
    [setValue]
  );

  return (
    <EuiForm>
      <EuiFormRow>
        <EuiSwitch label="Enabled" checked={field.value.enabled} onChange={handleEnabledChange} />
      </EuiFormRow>
      <EuiSpacer />
      <EuiFormRow>
        <EuiButtonIcon onClick={removeItem} color="danger" iconType="trash" />
      </EuiFormRow>
      <EuiFormRow>
        <EuiSelect
          value={field.value.vars.id.value}
          hasNoInitialSelection
          options={savedQueriesOptions}
          onChange={handleSavedQueryChange}
        />
      </EuiFormRow>
      <EuiSpacer />
      <EuiFormRow>
        <EuiFieldText value={field.value.vars.query.value} onChange={handleQueryChange} />
      </EuiFormRow>
      <EuiSpacer />
      <EuiFormRow>
        <EuiFieldText value={field.value.vars.interval.value} onChange={handleIntervalChange} />
      </EuiFormRow>
      <EuiSpacer />
      <EuiFormRow>
        <EuiFieldText value={field.value.vars.id.value} onChange={handleIdChange} />
      </EuiFormRow>
      <EuiSpacer />
      <EuiHorizontalRule />
    </EuiForm>
  );
};

export const OsqueryStreamField = React.memo(OsqueryStreamFieldComponent);
