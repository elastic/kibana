/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer } from '@elastic/eui';
import React, { useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { useMutation } from 'react-query';

import { useKibana } from '../../common/lib/kibana';
import { SavedQueryForm } from '../form';
import { LiveQueryForm } from '../../live_query/form';
import { ResultTabs } from '../edit/tabs';

const NewSavedQueryPageComponent = () => {
  const { http } = useKibana().services;
  const history = useHistory();

  const updateSavedQueryMutation = useMutation(
    (payload) => http.post(`/api/osquery/saved_query`, { body: JSON.stringify(payload) }),
    {
      onSuccess: (data) => {
        history.push(`/saved_query/queries/${data.id}`);
      },
    }
  );

  const handleSubmit = useCallback((payload) => updateSavedQueryMutation.mutate(payload), [
    updateSavedQueryMutation,
  ]);

  const createActionMutation = useMutation((payload) =>
    http.post('/api/osquery/action', { body: JSON.stringify(payload) })
  );

  console.error('createActionMutation', createActionMutation);

  return (
    <>
      <SavedQueryForm onSubmit={handleSubmit} />
      <EuiSpacer />
      <LiveQueryForm onSubmit={createActionMutation.mutate} />

      {createActionMutation.data ||
        (true && (
          <>
            <EuiSpacer />
            <ResultTabs
              actionId={
                '6f80265b-f4bd-40ac-a677-4b60426e1a69' ?? createActionMutation.data.action.action_id
              }
            />
          </>
        ))}
    </>
  );
};

export const NewSavedQueryPage = React.memo(NewSavedQueryPageComponent);
