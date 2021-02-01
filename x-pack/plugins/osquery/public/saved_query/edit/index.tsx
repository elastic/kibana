/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash/fp';
import { EuiSpacer } from '@elastic/eui';
import React, { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery } from 'react-query';

import { ResultTabs } from './tabs';
import { SavedQueryForm } from '../form';
import { useKibana } from '../../common/lib/kibana';

const EditSavedQueryPageComponent = () => {
  const { http } = useKibana().services;
  const { savedQueryId } = useParams<{ savedQueryId: string }>();

  const { isLoading, data: actionDetails } = useQuery(['savedQuery', { savedQueryId }], () =>
    http.get(`/api/osquery/saved_query/${savedQueryId}`)
  );
  const updateSavedQueryMutation = useMutation((payload) =>
    http.put(`/api/osquery/saved_query/${savedQueryId}`, { body: JSON.stringify(payload) })
  );

  const handleSubmit = useCallback((payload) => updateSavedQueryMutation.mutate(payload), [
    updateSavedQueryMutation,
  ]);

  if (isLoading) {
    return <>{'Loading...'}</>;
  }

  return (
    <>
      {!isEmpty(actionDetails) && (
        <SavedQueryForm actionDetails={actionDetails} onSubmit={handleSubmit} />
      )}
      <EuiSpacer />
      {/* <ResultTabs /> */}
    </>
  );
};

export const EditSavedQueryPage = React.memo(EditSavedQueryPageComponent);
