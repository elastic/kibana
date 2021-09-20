/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useMutation } from 'react-query';

import { PackForm } from '../common/pack_form';
import { useKibana } from '../../common/lib/kibana';

interface NewPackPageProps {
  onSuccess: () => void;
}

const NewPackPageComponent: React.FC<NewPackPageProps> = ({ onSuccess }) => {
  const { http } = useKibana().services;

  const addPackMutation = useMutation(
    (payload) =>
      http.post(`/internal/osquery/pack`, {
        body: JSON.stringify(payload),
      }),
    {
      onSuccess,
    }
  );

  // @ts-expect-error update types
  return <PackForm handleSubmit={addPackMutation.mutate} />;
};

export const NewPackPage = React.memo(NewPackPageComponent);
