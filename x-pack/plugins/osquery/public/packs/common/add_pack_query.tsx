/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable react-perf/jsx-no-new-object-as-prop */

import { EuiButton, EuiCodeBlock, EuiSpacer, EuiText, EuiLink, EuiPortal } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';

import { getUseField, useForm, Field, Form, FIELD_TYPES } from '../../shared_imports';
import { useKibana } from '../../common/lib/kibana';
import { AddNewPackQueryFlyout } from './add_new_pack_query_flyout';

const CommonUseField = getUseField({ component: Field });

// @ts-expect-error update types
const AddPackQueryFormComponent = ({ handleSubmit }) => {
  const queryClient = useQueryClient();
  const [showAddQueryFlyout, setShowAddQueryFlyout] = useState(false);

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

  const { form } = useForm({
    id: 'addPackQueryForm',
    onSubmit: handleSubmit,
    defaultValue: {
      query: {},
    },
    schema: {
      query: {
        type: FIELD_TYPES.SUPER_SELECT,
        label: 'Pick from Saved Queries',
      },
      interval: {
        type: FIELD_TYPES.NUMBER,
        label: 'Interval in seconds',
      },
    },
  });
  const { submit, isSubmitting } = form;

  const createSavedQueryMutation = useMutation(
    (payload) => http.post(`/internal/osquery/saved_query`, { body: JSON.stringify(payload) }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('savedQueryList');
        setShowAddQueryFlyout(false);
      },
    }
  );

  const queryOptions = useMemo(
    () =>
      // @ts-expect-error update types
      data?.saved_objects.map((savedQuery) => ({
        value: {
          id: savedQuery.id,
          attributes: savedQuery.attributes,
          type: savedQuery.type,
        },
        inputDisplay: savedQuery.attributes.name,
        dropdownDisplay: (
          <>
            <strong>{savedQuery.attributes.name}</strong>
            <EuiText size="s" color="subdued">
              <p className="euiTextColor--subdued">{savedQuery.attributes.description}</p>
            </EuiText>
            <EuiCodeBlock language="sql" fontSize="m" paddingSize="m">
              {savedQuery.attributes.query}
            </EuiCodeBlock>
          </>
        ),
      })) ?? [],
    [data?.saved_objects]
  );

  const handleShowFlyout = useCallback(() => setShowAddQueryFlyout(true), []);
  const handleCloseFlyout = useCallback(() => setShowAddQueryFlyout(false), []);

  return (
    <>
      <Form form={form}>
        <CommonUseField
          path="query"
          labelAppend={
            <EuiText size="xs">
              <EuiLink onClick={handleShowFlyout}>{'Add new saved query'}</EuiLink>
            </EuiText>
          }
          euiFieldProps={{
            options: queryOptions,
          }}
        />
        <EuiSpacer />
        <CommonUseField path="interval" />
        <EuiSpacer />
        <EuiButton isLoading={isSubmitting} fill onClick={submit}>
          {'Add query'}
        </EuiButton>
      </Form>
      {showAddQueryFlyout && (
        <EuiPortal>
          <AddNewPackQueryFlyout
            handleClose={handleCloseFlyout}
            handleSubmit={createSavedQueryMutation.mutate}
          />
        </EuiPortal>
      )}
    </>
  );
};

export const AddPackQueryForm = React.memo(AddPackQueryFormComponent);
