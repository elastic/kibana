/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer } from '@elastic/eui';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { useMutation } from 'react-query';

import { useForm, useFormData } from '../../shared_imports';
import { useKibana } from '../../common/lib/kibana';
import { SavedQueryForm } from '../form';
import { LiveQueryForm } from '../../live_query/form';
import { ResultTabs } from '../edit/tabs';

const SAVED_QUERY_FORM_ID = 'savedQueryForm';

const NewSavedQueryPageComponent = () => {
  const { http } = useKibana().services;
  const history = useHistory();

  const createSavedQueryMutation = useMutation(
    (payload) => http.post(`/api/osquery/saved_query`, { body: JSON.stringify(payload) }),
    {
      onSuccess: (data) => {
        history.push(`/queries/${data.id}`);
      },
    }
  );

  const { form: savedQueryForm } = useForm({
    id: SAVED_QUERY_FORM_ID,
    // schema: formSchema,
    onSubmit: createSavedQueryMutation.mutate,
    options: {
      stripEmptyFields: false,
    },
    defaultValue: {},
  });

  const [savedQueryFormData] = useFormData({
    watch: ['command'],
    form: savedQueryForm,
  });

  const createActionMutation = useMutation((payload: Record<string, any>) =>
    http.post('/api/osquery/action', {
      body: JSON.stringify({ ...payload, command: savedQueryFormData.command }),
    })
  );

  // console.error('createActionMutation', createActionMutation);
  // console.error('savedQueryFormData', savedQueryFormData);

  return (
    <>
      <SavedQueryForm form={savedQueryForm} />
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

export const NewSavedQueryPage = React.memo(NewSavedQueryPageComponent);
