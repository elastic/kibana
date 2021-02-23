/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import React from 'react';
import { useMutation, useQuery } from 'react-query';

import { SavedQueryForm } from '../form';
import { useKibana } from '../../common/lib/kibana';

interface EditSavedQueryPageProps {
  onSuccess: () => void;
  savedQueryId: string;
}

const EditSavedQueryPageComponent: React.FC<EditSavedQueryPageProps> = ({
  onSuccess,
  savedQueryId,
}) => {
  const { http } = useKibana().services;

  const { isLoading, data: savedQueryDetails } = useQuery(['savedQuery', { savedQueryId }], () =>
    http.get(`/internal/osquery/saved_query/${savedQueryId}`)
  );
  const updateSavedQueryMutation = useMutation(
    (payload) =>
      http.put(`/internal/osquery/saved_query/${savedQueryId}`, { body: JSON.stringify(payload) }),
    { onSuccess }
  );

  if (isLoading) {
    return <>{'Loading...'}</>;
  }

  return (
    <>
      {!isEmpty(savedQueryDetails) && (
        <SavedQueryForm
          defaultValue={savedQueryDetails}
          // @ts-expect-error update types
          handleSubmit={updateSavedQueryMutation.mutate}
          type="edit"
        />
      )}
    </>
  );
};

export const EditSavedQueryPage = React.memo(EditSavedQueryPageComponent);
