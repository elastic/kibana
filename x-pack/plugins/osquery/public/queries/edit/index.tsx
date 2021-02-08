/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import { EuiSpacer } from '@elastic/eui';
import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery } from 'react-query';

import { useForm, useFormData } from '../../shared_imports';
import { ResultTabs } from './tabs';
import { SavedQueryForm } from '../form';
import { useKibana } from '../../common/lib/kibana';
import { LiveQueryForm } from '../../live_query/form';

const EDIT_QUERY_FORM_ID = 'editQueryForm';

const EditSavedQueryPageComponent = () => {
  const { http } = useKibana().services;
  const { savedQueryId } = useParams<{ savedQueryId: string }>();

  const { isLoading, data: actionDetails } = useQuery(['savedQuery', { savedQueryId }], () =>
    http.get(`/internal/osquery/saved_query/${savedQueryId}`)
  );
  const updateSavedQueryMutation = useMutation((payload) =>
    http.put(`/internal/osquery/saved_query/${savedQueryId}`, { body: JSON.stringify(payload) })
  );

  const { form: savedQueryForm } = useForm({
    id: EDIT_QUERY_FORM_ID,
    // schema: formSchema,
    onSubmit: updateSavedQueryMutation.mutate,
    options: {
      stripEmptyFields: false,
    },
  });

  useEffect(() => {
    if (actionDetails?.attributes) {
      savedQueryForm.setFieldValue('title', actionDetails?.attributes?.title);
      savedQueryForm.setFieldValue('description', actionDetails?.attributes?.description);
      savedQueryForm.setFieldValue('command', actionDetails?.attributes?.command);
    }
  }, [actionDetails, savedQueryForm]);

  const [savedQueryFormData] = useFormData({
    watch: ['command'],
    form: savedQueryForm,
  });

  const createActionMutation = useMutation((payload: Record<string, any>) =>
    http.post('/internal/osquery/action', {
      body: JSON.stringify({ ...payload, command: savedQueryFormData.command }),
    })
  );

  if (isLoading) {
    return <>{'Loading...'}</>;
  }

  return (
    <>
      {!isEmpty(actionDetails) && <SavedQueryForm form={savedQueryForm} />}
      <EuiSpacer />
      <LiveQueryForm onSubmit={createActionMutation.mutate} />

      {createActionMutation.data && (
        <>
          <EuiSpacer />
          <ResultTabs actionId={createActionMutation.data?.action.action_id} />
        </>
      )}
    </>
  );
};

export const EditSavedQueryPage = React.memo(EditSavedQueryPageComponent);
