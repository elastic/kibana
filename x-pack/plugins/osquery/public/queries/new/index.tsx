/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useMutation } from 'react-query';

import { useKibana } from '../../common/lib/kibana';
import { SavedQueryForm } from '../form';

interface NewSavedQueryPageProps {
  onSuccess: () => void;
}

const NewSavedQueryPageComponent: React.FC<NewSavedQueryPageProps> = ({ onSuccess }) => {
  const { http } = useKibana().services;

  const createSavedQueryMutation = useMutation(
    (payload) => http.post(`/internal/osquery/saved_query`, { body: JSON.stringify(payload) }),
    {
      onSuccess,
    }
  );

  // @ts-expect-error update types
  return <SavedQueryForm handleSubmit={createSavedQueryMutation.mutate} />;
};

export const NewSavedQueryPage = React.memo(NewSavedQueryPageComponent);
